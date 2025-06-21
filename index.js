const express = require('express')
const jwt = require('jsonwebtoken')
const app = express()
require('dotenv').config()
const cors = require('cors')
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dvgqaep.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
    const menuCollection = client.db('bistroDB').collection('menu');
    const reviewCollection = client.db('bistroDB').collection('reviews');
    const cardCollection = client.db('bistroDB').collection('cards');
    const userCollection = client.db('bistroDB').collection('users');

    //middleWare
    const veryfiToken = (req, res, next) => {
      console.log('inside verify Token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        res.decoded = decoded;
        next();
      })
    };
    //use verifyAdmin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        res.status(403).send({ message: 'forbidden access' })
      }
      next();
    };

    // jwt related api 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })

    })

    //clicnt side releted
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result)
    });
    app.post('/menu', veryfiToken,verifyAdmin, async(req,res)=>{
      const addItem=req.body;
      const result=await menuCollection.insertOne(addItem);
      res.send(result)
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)
    });

    //spicifik card releated api / order related

    app.get('/cards', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await cardCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/cards', async (req, res) => {
      const cardItem = req.body;
      const result = await cardCollection.insertOne(cardItem);
      res.send(result);
    });

    app.delete('/cards/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await cardCollection.deleteOne(query);
      res.send(result);
    });

    //users related api
    app.get('/users', veryfiToken,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    });
    app.get('/users/admin/:email', veryfiToken, async (req, res) => {
      const email = req.params.email;
      if (email !== res.decoded.email) {//verify token ar pore email pabo
        res.status(403).send({ message: 'forbidden access' })

      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      //insert email if user dose not exists
      //you can do this any way(1.simple checking 2.upsert 3.email unique, here option 1)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Boss is working')
});

app.listen(port, () => {
  console.log(`bistro boss is working port ${port}`)
});