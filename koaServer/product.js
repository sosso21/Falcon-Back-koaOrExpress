const Router = require('koa-router');
const shortid = require('shortid');
const mongoose = require('mongoose');

 
const router = new Router();

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
    
     
 
// see products 
    router.get("/api/products", async (ctx) => {
    const Products = await Product.find();
    
    ctx.body = Products;
});

//add product
router.post('/api/product', async (ctx) => {
    const newProduct = new Product(ctx.request.body);
     const savedProduct = await newProduct.save();
     ctx.body = savedProduct;
})

// delete product 
router.delete('api/product/:id', async (ctx) => {
    const deleeProduct = await Product.findByIdAndDetelete(ctx.request.params.id)
    ctx.body =  deleeProduct
})


.get('/a',async (ctx, next) => {
    console.log('ctx:', ctx)
    
     ctx.body = {'ctx:': ctx.request.body , "date": ctx.query };

    
    // handle your post request here
 //   ctx.body = ctx.request.body;
  })

module.exports =router
