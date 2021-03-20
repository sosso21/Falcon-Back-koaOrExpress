const express = require("express");
const bodyParser = require("body-parser");
const shortid = require("shortid");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const {
  verifyEmail,
  verifyPass,
  verifyName,
} = require("./functions/emailPassVerificator.js");
const sendEmail = require("./functions/sendEmail.js");
const jwt_utils = require("./functions/jwt.utils.js");
const fs = require("fs");
const {
  json
} = require("body-parser");


const app = express.Router();
// parse application/x-www-form-urlencoded
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

// parse application/json
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URL || "mongodb://localhost/ct-db", {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const Users = mongoose.model(
  "users",
  new mongoose.Schema({
    _id: {
      type: String,
      default: shortid.generate,
    },
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    pass: {
      type: String,
      required: true,
    },
    phone: {
      type: Array,
      default: [],
    },
    addr: {
      type: Array,
      default: [],
    },
    promo: {
      type: Object,
      default: {
        value: -1,
      }
    },
    isAdmin: {
      type: Number,
      default: -1,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  })
);

// connection
app.post("/api/connect", async (req, res) => {
  const ISO = req.headers["user-agent"];

  const success = (infoUser) => {
    if (infoUser <= -2) {
      return res.send({
        error: "vous êtes bannie",
      });
    }
    if (infoUser == -1) {
      return res.send({
        error: "confirmez votre email",
      });
    }

    const token = jwt_utils.generateTokenForUser(infoUser, 3600 * 24 * 90, {
      ISO: ISO,
    });

    res.send({
      token: token,
      userInfo: {
        _id: infoUser._id,
        firstname: infoUser.firstname,
        lastname: infoUser.lastname,
        email: infoUser.email,
        phone: infoUser.phone,
        addr: infoUser.addr,
        promo: infoUser.promo,
        isAdmin: infoUser.isAdmin,
        date: infoUser.date,
      },
    });
  };

  if (req.body.email != undefined && req.body.pass != undefined) {
    const email = req.body.email;
    const pass = req.body.pass;
    const infoUser = await Users.findOne({
      email: email,
    });

    if (infoUser == null) {
      return res.send({
        error: "email/mot de passe incorrecte",
      });
    }

    bcrypt.compare(pass, infoUser.pass, (err, result) => {
      if (result) {
        console.log(infoUser.isAdmin);
        if (infoUser.isAdmin == -1) {
          return res.send({
            error: -1,
          });
        }

        return success(infoUser);
      } else {
        return res.send({
          error: "email/mot de passe incorrecte",
        });
      }
    });
  } else if (req.body.token != undefined) {
    const decodeToken = jwt_utils.getUserInfo(JSON.parse(req.body.token));
    if (decodeToken != -1 && decodeToken.ISO == ISO) {
      const infouser = await Users.findOne({
        _id: decodeToken.userId,
        isAdmin: {
          $gt: -1,
        },
      });
      if (infouser == null) {
        return res.send({
          error: "disconnect",
        });
      }
      return success(infouser);
    } else {
      return res.send({
        error: "disconnect",
      });
    }
  } else {
    return res.send({
      error: "error",
    });
  }
});

// inscroption
app.post("/api/register", async (req, res) => {
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const email = req.body.email;
  const pass = req.body.pass;
  req.body.pass = await bcrypt.hash(pass, 10);

  if (!verifyName(firstname) || !verifyName(lastname)) {
    return res.send({
      error: "le nom et le prénom doit contenir entre 2 et 30 caractères ",
    });
  }
  if (!verifyEmail(email)) {
    return res.send({
      error: "email invalide ",
    });
  }
  if (!verifyPass(pass)) {
    return res.send({
      error: "le mot de passe doit contenir au moin : 8 caractàres , une majuscule ,une minuscule et 2 chiffres",
    });
  }
  const exist = await Users.find({
    email: email,
  });
  if (exist.length != 0) {
    return res.send({
      error: `cet email est déjà existant`,
    });
  }

  const newUser = new Users(req.body);

  const savedUser = await newUser.save();

  const token = jwt_utils.generateTokenForUser(savedUser, 60 * 15);

  fs.readFile(
    "./templateEmail/confirmationReegister.txt",
    "utf-8",
    (err, data) => {
      data = data
        .split("#firstname")
        .join(firstname)
        .split("#lastname")
        .join(lastname)
        .split("#token")
        .join(token);
      sendEmail(email, "Confirmez Votre Email", data);

      res.send({
        success: `un email de confirmation a été envoyer  à ${email}`,
      });
    }
  );
});

// confirm email
app.get("/api/confirmEmail", async (req, res) => {
  const token = req.query.token;
  const auth = jwt_utils.getUserInfo(token);

  if (auth != -1) {
    if (auth.email != undefined) {
      await Users.updateOne({
        _id: auth.userId,
      }, {
        $set: {
          email: auth.email,
        },
      });
      await Users.updateOne({
        _id: auth.userId,
        isAdmin: -1,
      }, {
        $set: {
          isAdmin: 0,
        },
      });
      res.redirect("http://localhost:3000/");
    } else {
      await Users.updateOne({
        _id: auth.userId,
      }, {
        $set: {
          isAdmin: 0,
        },
      });
      res.redirect("http://localhost:3000/login");
    }
  } else {
    res.send("<h1> :( le lien a expirer  </h1>");
  }
});

//  send email to confirm
app.post("/api/sendMeEmailConfirmation", async (req, res) => {
  const email = req.body.email;
  let auth = "";
  if (req.body.authorization) {
    auth = jwt_utils.getUserInfo(req.body.authorization);
    if (auth == -1) {
      return res.send({
        error: "token expired",
      });
    }
  } else {
    const user = await Users.findOne({
      email: email,
    });

    auth = {
      _id: user._id,
      isAdmin: user.isAdmin,
    };
    if (user.length == 0) {
      return res.send({
        error: "error",
      });
    }
  }

  const token = await jwt_utils.generateTokenForUser(auth, 60 * 15, {
    email: email,
  });

  fs.readFile(
    "./templateEmail/confirmationReegister.txt",
    "utf-8",
    (err, data) => {
      data = data
        .split("#firstname")
        .join("Cher client")
        .split("#lastname")
        .join(" ")
        .split("#token")
        .join(token);
      sendEmail(email, "Confirmez Votre Email", data);

      res.send({
        success: `un email de confirmation a été envoyer  à ${email}`,
      });
    }
  );
});

// send email to reset password
app.post("/api/sendEmailToResetPwd", async (req, res) => {
  const email = req.body.email;
  const infoUser = await Users.findOne({
    email: email,
  });
  if (infoUser != null) {
    const token = await jwt_utils.generateTokenForUser({
      _id: infoUser._id,
      isAdmin: infoUser.isAdmin,
    },
      60 * 15
    );

    fs.readFile("./templateEmail/mpmissing.txt", "utf-8", (err, data) => {
      data = data
        .split("#firstname")
        .join(infoUser.firstname)
        .split("#lastname")
        .join(infoUser.lastname)
        .split("#token")
        .join(token);
      sendEmail(email, "Réinitialiser Votre mot de passe", data);

      res.send({
        response: "success",
      });
    });
  } else {
    res.send({
      response: "vous n'êtes pas inscrit grace à cet email",
    });
  }
});

// reset forget password
app.post("/api/resetPasswordForget", async (req, res) => {
  const token = req.body.authorization;
  const pass = req.body.pass;
  const decodeToken = await jwt_utils.getUserInfo(token);

  if (decodeToken != -1) {
    if (!verifyPass(pass)) {
      return res.send({
        response: "le mot de passe doit contenir au moin : 8 caractàres , une majuscule ,une minuscule et 2 chiffres",
      });
    } else {
      const hashPassword = await bcrypt.hash(pass, 10);
      await Users.updateOne({
        _id: decodeToken.userId,
      }, {
        $set: {
          pass: hashPassword,
        },
      });
      return res.send({
        response: "success",
      });
    }
  } else {
    return res.send({
      response: "le lien a expirer.",
    });
  }
});

// update info
app.post("/api/updateUser", async (req, res) => {
  const success = (infoUser) => {
    return res.send({
      success: "La modification a bien été enregistrer",
      userInfo: {
        _id: infoUser._id,
        firstname: infoUser.firstname,
        lastname: infoUser.lastname,
        email: infoUser.email,
        phone: infoUser.phone,
        addr: infoUser.addr,
        promo: infoUser.promo,
        isAdmin: infoUser.isAdmin,
        date: infoUser.date,
      },
    });
  };

  const disconnect = () => {
    res.send({
      error: "disconnect",
    });
  };

  const body = req.body;
  const form = JSON.parse(body.form);
  const operation = body.operation;
  console.log("====================================");
  console.log("body", body);
  console.log("form:", form);
  console.log("operation : ", operation);
  console.log("====================================");
  if (body.token != undefined) {
    const decodeToken = jwt_utils.getUserInfo(JSON.parse(body.token));
    if (decodeToken != -1) {
      const infouser = await Users.findOne({
        _id: decodeToken.userId,
        isAdmin: {
          $gt: -1,
        },
      });
      if (["name", "email", "password"].includes(operation)) {
        bcrypt.compare(form.pass, infouser.pass, (err, result) => {
          if (!result) {
            return res.send({
              error: "Mot de passe incorrect",
            });
          }
        });
      }
      console.log("infouser : ", infouser);
      if (
        operation == "name" &&
        infouser.firstname != form.firstname &&
        infouser.lastname != form.lastname
      ) {
        if (!verifyName(form.firstname) || !verifyName(form.lastname)) {
          return res.send({
            error: "le nom et le prénom doit contenir entre 2 et 30 caractères ",
          });
        }
        await Users.updateOne({
          _id: decodeToken.userId,
        }, {
          $set: {
            firstname: form.firstname,
            lastname: form.lastname,
          },
        });

        const newInfoUser = await Users.findOne({
          _id: decodeToken.userId,
        });
        return success(newInfoUser);
      } else if (operation == "email" && infouser.email != form.email) {
        if (!verifyEmail(form.email)) {
          return res.send({
            error: "email invalide ",
          });
        }

        const newInfoUser = await Users.findOne({
          _id: decodeToken.userId,
        });
        const token = jwt_utils.generateTokenForUser(newInfoUser, 60 * 15, {
          email: form.email,
        });

        fs.readFile(
          "./templateEmail/confirmationReegister.txt",
          "utf-8",
          (err, data) => {
            data = data
              .split("#firstname")
              .join(newInfoUser.firstname)
              .split("#lastname")
              .join(newInfoUser.lastname)
              .split("#token")
              .join(token);
            sendEmail(form.email, "Confirmez Votre Email", data);

            return res.send({
              success: `un email de confirmation a été envoyer  à ${form.email}`,
            });
          }
        );
      } else if (operation == "password") {
        if (!verifyPass(form.newPass)) {
          return res.send({
            error: " Le nouveau mot de passe doit contenir au minimum 8 caractères, une majuscule, un chiffre ",
          });
        }
        bcrypt.compare(form.newPass, infouser.pass, (err, result) => {
          if (result) {
            return res.send({
              error: " ce mot de passe correspend déjà au votre",
            });
          }
        });

        const hashPassword = await bcrypt.hash(form.newPass, 10);

        await Users.updateOne({
          _id: decodeToken.userId,
        }, {
          $set: {
            pass: hashPassword,
          },
        });

        return res.send({
          response: "success",
        });
      } else if (operation == "phone") {
        if (form.phone.phone.length != 9) {
          return res.send({
            error: "Le numero de téléphone doit contenir 9 chiffres",
          });
        }

        await Users.updateOne({
          _id: decodeToken.userId,
        }, {
          $set: {
            phone: [
              form.phone.iso2,
              "+" + +form.phone.dialCode,
              form.phone.phone,
            ],
          },
        });

        const newInfoUser = await Users.findOne({
          _id: decodeToken.userId,
        });
        return success(newInfoUser);
      } else if (operation == "removePhone") {
        await Users.updateOne({
          _id: decodeToken.userId,
        }, {
          $set: {
            phone: [],
          },
        });

        const newInfoUser = await Users.findOne({
          _id: decodeToken.userId,
        });
        return success(newInfoUser);
      } else if (operation == "addr") {
        await Users.updateOne({
          _id: decodeToken.userId,
        }, {
          $set: {
            addr: [
              form.street,
              form.town,
              form.code,
              form.contry.value + ", " + form.contry.label,
            ],
          },
        });

        const newInfoUser = await Users.findOne({
          _id: decodeToken.userId,
        });
        return success(newInfoUser);
      } else if (operation == "removeAddr") {
        await Users.updateOne({
          _id: decodeToken.userId,
        }, {
          $set: {
            addr: [],
          },
        });

        const newInfoUser = await Users.findOne({
          _id: decodeToken.userId,
        });
        return success(newInfoUser);
      } else {
        res.send({
          error: "ces informations sont déjà renseignées ",
        });
      }
    } else {
      disconnect();
    }
  } else {
    disconnect();
  }
});

// promo
app.post('/api/promo/user', async (req, res) => {

  const form = JSON.parse(req.body.form)
  const decodeToken = await jwt_utils.getUserInfo(JSON.parse(req.body.token));
  const op = req.body.operation;
  const infoUser = await Users.findOne({
    _id: decodeToken.userId
  });


  const disconnect = () => {
    res.send({
      error: 'disconnect'
    })
  }



  if (decodeToken == -1) {
    return disconnect()
  }
  if (op == "edit" && infoUser.promo.value != 1) {
    return disconnect()
  }

  if (form.code) {
    const existentCode = await Users.findOne({
      'promo.code': form.code.toUpperCase(),
      _id: {
        $ne: infoUser._id
      }
    });
    if (existentCode) {
      return res.send({
        error: `le code créateur ${form.code} existe déjà`
      })
    }
  }
  const newPromo = {
    value: (op == "ask") ? 0 : 1,
    media: form.media ? form.media : "-",
    code: form.code ? form.code.toUpperCase() : infoUser._id.toUpperCase(),
    payment: form.payment ? form.payment : "-",
    solde: infoUser.promo.solde ? infoUser.promo.solde : 0,
    benef: infoUser.promo.benef ? infoUser.promo.benef : 0,
    money: {
      actual: infoUser.promo.money.actual ? infoUser.promo.money.actual : 0,

      total: infoUser.promo.money.total ? infoUser.promo.money.total : 0,
      askToPay: infoUser.promo.money.askToPay ? infoUser.promo.money.askToPay : false,
    }

  };

  await Users.updateOne({
    _id: infoUser._id,
  }, {
    $set: {
      promo: newPromo
    }
  });


  return res.send({
    success: newPromo
  })

})


// see code pursentage 
app.post('/api/promo/purcent', async (req, res) => {
 
  const code = req.body.code
  const zero = () => {
    return res.send({
      reduction: 0
    })
  }
  if (code) {

    const infoUser = await Users.findOne({ 
      "promo.value": 1,
      "promo.code": code
    });
    if (infoUser) {
      return res.send({
        reduction: infoUser.promo.solde
      })
    } else {
      return zero()
    }
  } else {
    console.log({
      reduction: 0
    })
    return zero()
  }
})


// payme 
app.post('/api/promo/PayMe', async (req, res) =>{
  const decodeToken = await jwt_utils.getUserInfo(JSON.parse(req.body.token));
  console.log('decodeToken:', decodeToken)
  const infoUser = await Users.findOne({_id : decodeToken.userId})
if(infoUser.promo.money.actual > 50 || infoUser.promo.money.askToPay == false ){

  await Users.updateOne({
    _id: infoUser._id,
  }, {
    $set: {
      "promo.money.askToPay": true
    }
  });
  return res.send({response: "success"})

}


})


module.exports = app;



/*
use  ct-db
db.users.update({}, {
  $set: {
    "promo":
    {
      value: 1,
      media: "ytb : YANRKHIS",
      code: "MISTYAN",
      payment: "paypal",
      solde: 10 ,
            benef: 10,
      money: {
        actual: 200,
        total: 350,
        askToPay: false
      }

    }
  }
})

db.users.find().pretty()
 
////////////////////////////


db.products.update({
  _id : 8
}, {
  $set: { 
   image : [
                "http://127.0.0.1:5000/static/10.jpg",
                "http://127.0.0.1:5000/static/09.jpg",
                "http://127.0.0.1:5000/static/11.jpg"
        ]
  }
})
 
 
*/

