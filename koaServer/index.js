const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
serve   = require('koa-static');
const mount = require('koa-mount');
const cors = require('@koa/cors');
const setProduct = require("./product.js")
const setUsers = require('./users.js')
//const image = require('./image.js')

const app = new Koa();
//const router = new Router();
app.use(bodyParser());
app.use(cors());
app
  .use(setProduct.routes())
  .use(setProduct.allowedMethods());
  
  app
    .use(setUsers.routes())
    .use(setUsers.allowedMethods());
    
    app.use(mount('/static',  serve(__dirname + '/imgs' )));

//app.use(setUsers)
// app.use(image)

/*
router
  .get('/', async (ctx, next) => {
    
    console.log('ctx:', ctx.query)
    ctx.body = {'ctx:': ctx};


  })
  .post('/users',async (ctx, next) => {
    console.log('ctx:', ctx.request.body)
     ctx.body = {'ctx:': ctx.request.body , "date":  new  Date() };
    
    // handle your post request here
 //   ctx.body = ctx.request.body;
  })
  .put('/users/:id', (ctx, next) => {
    // ...
  })
  .del('/users/:id', (ctx, next) => {
    // ...
  })
  .all('/users/:id', (ctx, next) => {
    // ...
  });
  app
  .use(router.routes())
  .use(router.allowedMethods());
  */

const port = process.env.PORT || 5000;
app.listen(port, () => { console.log('Magic happens on port ' + port); });