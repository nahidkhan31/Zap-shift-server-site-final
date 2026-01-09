const express = require('express')
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY);
// middleware
app.use(express.json());
app.use(cors());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hauetn5.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('zap_shift_db'); //database name
    const parcelsCollection = db.collection('parcels'); //collection
    const paymentsCollection = db.collection('payments'); // payment collection
    const trackingsCollection = db.collection('trackings');
     

    app.get('/parcels', async (req, res) => {
            const parcels = await parcelsCollection.find().toArray();
            res.send(parcels);
        });
      

         // parcels api
        // GET: All parcels OR parcels by user (senderEmail), sorted by latest
        app.get('/parcels', async (req, res) => {
            try {
                const userEmail = req.query.email;

                const query = userEmail ? { senderEmail: userEmail } : {};
                const options = {
                    sort: { createdAt: -1 }, // Newest first
                };

                const parcels = await parcelsCollection.find(query, options).toArray();
                res.send(parcels);
            } catch (error) {
                console.error('Error fetching parcels:', error);
                res.status(500).send({ message: 'Failed to get parcels' });
            }
        });


         // GET: Get a specific parcel by ID
        app.get('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const parcel = await parcelsCollection.findOne({ _id: new ObjectId(id) });

                if (!parcel) {
                    return res.status(404).send({ message: 'Parcel not found' });
                }  

                res.send(parcel);
            } catch (error) {
                console.error('Error fetching parcel:', error);
                res.status(500).send({ message: 'Failed to fetch parcel' });
            }
        });

          
        // POST: Create a new parcel
        app.post('/parcels', async (req, res) => {
            try {
                const parcel = req.body;
                // newParcel.createdAt = new Date();
                const newParcel = {
      ...parcel,
      tracking_id: `ZAP-${Math.floor(100000 + Math.random() * 900000)}`,
      payment_status: 'unpaid',
      delivery_status: 'pending',
      creation_date: new Date()
    };
                const result = await parcelsCollection.insertOne(newParcel);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error inserting parcel:', error);
                res.status(500).send({ message: 'Failed to create parcel' });
            }
        });

         app.delete('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const result = await parcelsCollection.deleteOne({ _id: new ObjectId(id) });

                res.send(result);
            } catch (error) {
                console.error('Error deleting parcel:', error);
                res.status(500).send({ message: 'Failed to delete parcel' });
            }
        });






        // Stripe setup....

         app.get('/payments', async (req, res) => {
            try {
                const userEmail = req.query.email;

                const query = userEmail ? { email: userEmail } : {};
                const options = { sort: { paid_at: -1 } }; // Latest first

                const payments = await paymentsCollection.find(query, options).toArray();
                res.send(payments);
            } catch (error) {
                console.error('Error fetching payment history:', error);
                res.status(500).send({ message: 'Failed to get payments' });
            }
        });

            // POST: Record payment and update parcel status
        app.post('/payments', async (req, res) => {
            try {
                const { parcelId, email, name, amount, paymentMethod, transactionId } = req.body;

                // 1. Update parcel's payment_status
                const updateResult = await parcelsCollection.updateOne(
                    { _id: new ObjectId(parcelId) },
                    {
                        $set: {
                            payment_status: 'paid'
                        }
                    }
                );

                if (updateResult.modifiedCount === 0) {
                    return res.status(404).send({ message: 'Parcel not found or already paid' });
                }

                // 2. Insert payment record
                const paymentDoc = {
                    parcelId,
                    email,
                    name,
                    amount,
                    paymentMethod,
                    transactionId,
                    paid_at_string: new Date().toISOString(),
                    paid_at: new Date(),
                };

                const paymentResult = await paymentsCollection.insertOne(paymentDoc);

                res.status(201).send({
                    message: 'Payment recorded and parcel marked as paid',
                    insertedId: paymentResult.insertedId,
                });

            } catch (error) {
                console.error('Payment processing failed:', error);
                res.status(500).send({ message: 'Failed to record payment' });
            }
        });






        app.post('/create-payment-intent', async (req, res) => {
            const amountInCents = req.body.amountInCents
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCents, // Amount in cents
                    currency: 'usd',
                    payment_method_types: ['card'],
                });

                res.json({ clientSecret: paymentIntent.client_secret });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// sample route
app.get('/', (req, res)=>{
    res.send('Parcel Server is running');
})

//Start the server 
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})