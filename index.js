const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000;
const cors = require('cors')
require('dotenv').config()


// middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const e = require('cors');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7dcoggr.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const somitiCollection = client.db('somitiManagement').collection('somiti')
    const userCollection = client.db('somitiManagement').collection('user')

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token })
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    app.get('/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    // get all user from the database
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      // console.log(req.headers);
      const users = userCollection.find();
      const result = await users.toArray();
      res.send(result);
    })

    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    // admin related api
    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result)
    })

    // delete single user
    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })

    // total users length
    app.get('/userLength', async (req, res) => {
      const count = await userCollection.estimatedDocumentCount();
      res.send({ count })
    })

    // get single member from database
    app.get('/user/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(filter);
      res.send(result);
    })

    // loan related api

    app.get('/userInfo/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await userCollection.findOne(query);
      if (result) {
        const userId = result.userId;
        res.send({ userId });
      } else {
        res.status(404).send('result not found');
      }
    })

    app.post('/applyLoan', async (req, res) => {
      const applyLoan = req.body;
      const result = await somitiCollection.insertOne(applyLoan);
      res.send(result);
    })

    app.get('/allAppliedLoan', verifyToken, verifyAdmin, async (req, res) => {

      let query = {};
      if (req.query?.status) {
        query = { status: req.query?.status }
      }
      const result = await somitiCollection.find(query).toArray();
      res.send(result);
    })

    // update apply loan status 
    app.patch('/loanInfo/:id', async (req, res) => {
      const id = req.params.id;
      const newLoanInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          userId: newLoanInfo.userId,
          name: newLoanInfo.name,
          date: newLoanInfo.date,
          email: newLoanInfo.email,
          email: newLoanInfo.email,
          mobile: newLoanInfo.mobile,
          religion: newLoanInfo.religion,
          fatherName: newLoanInfo.fatherName,
          matherName: newLoanInfo.matherName,
          presentAddress: newLoanInfo.presentAddress,
          permanentAddress: newLoanInfo.permanentAddress,
          NID: newLoanInfo.NID,
          loanInfo: newLoanInfo.loanInfo,
          amount: newLoanInfo.amount,
          status: newLoanInfo.status,
          totalAmount: newLoanInfo.totalAmount
        }
      };
      const result = await somitiCollection.updateOne(query, update)
      res.send(result);
    })

    // single user loan info
    app.get('/loanInfo/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await somitiCollection.findOne(query);
      res.send(result);
    })

    // delete single applied loan information from database
    app.delete('/applyLoan/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await somitiCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/paidLoan/:id', async (req, res) => {
      const id = req.params.id;
      const newLoanInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $push: {
          'loanInfo': newLoanInfo
        }
      };
      const result = await somitiCollection.updateOne(query, update)
      res.send(result);
    });

    // user related api
    app.get('/userLoan', async (req, res) => {
      const email = req.query?.email;
      const query = { email };
      const result = await somitiCollection.find(query).toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})