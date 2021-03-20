const express = require('express');
const bodyParser = require('body-parser');
const shortid = require('shortid');
const mongoose = require('mongoose');

const app = express.Router();
app.use(bodyParser.json())


mongoose.connect(
    process.env.MONGODB_URL || "mongodb://localhost/ct-db", {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
    });


    const Product = mongoose.model(
        "products",
        new mongoose.Schema({
            _id: { type: String, default: shortid.generate },
            name: {
                type: String,
                required: true
            },
            image: {
                type: Array,
                default: ['default.jpeg']
            },
            description: {
                type: String,
                required: true
            },
            type: {
                type: Array,
                default: []
        
            },
            price: {
                type: Array,
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            }
        }));
    
     
 

app.get("/api/products", async(req, res) => {
    const Products = await Product.find();
    console.log('Products:')
    return  res.send(Products);
});

app.post('/api/product', async(req, res) => {
    const newProduct = new Product(req.body);
     const savedProduct = await newProduct.save();
    res.send(savedProduct);
})

app.delete('api/product/:id', async(req, res) => {
    const deleeProduct = await Product.findByIdAndDetelete(req.params.id)
     req.send(deleeProduct)
})



module.exports = app