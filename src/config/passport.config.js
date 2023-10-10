import passport from "passport";
import github from "passport-github2";
import local from "passport-local";
import crypto from "crypto";
import { modeloUsuarios } from "../dao/models/usuarios.models.js";
import { generaHash, validaHash } from "../utils.js";

export const inicializaPassport = () => {
  passport.use(
    "github",
    new github.Strategy(
      {
        clientID: "Iv1.5398fe3bedde12fb",
        clientSecret: "f8bcb666cb3df92ffc2caedb16318b90be684996",
        callbackURL: "http://localhost:8080/api/sessions/callbackGithub",
      },
      async (token, tokenRefresh, profile, done) => {
        try {
          console.log(profile);
          let usuario = await modeloUsuarios.findOne({
            email: profile._json.email,
          });
          if (!usuario) {
            usuario = await modeloUsuarios.create({
              nombre: profile._json.name,
              email: profile._json.email,
              github: profile,
            });
          }

          return done(null, usuario);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.use(
    "registro",
    new local.Strategy(
      {
        usernameField: "email",
        passReqToCallback: true,
      },
      async (req, username, password, done) => {
        try {
          let { nombre, email, password } = req.body;

          if (!nombre || !email || !password) {
            done(null, false);
          }
          let existe = await modeloUsuarios.findOne({ email });
          if (existe) {
            done(null, false);
          }

          let usuario = await modeloUsuarios.create({
            nombre,
            email,
            password: generaHash(password),
          });

          console.log("pasando x passport registro...!!!");

          done(null, usuario);
        } catch (error) {
          done(error);
        }
      }
    )
  );

  passport.use(
    "login",
    new local.Strategy(
      {
        usernameField: "email",
      },
      async (username, password, done) => {
        try {
          if (!username || !password) {
            done(null, false);
          }

          // password = crypto
          //   .createHmac("sha256", "palabraSecreta")
          //   .update(password)
          //   .digest("base64");

          let usuario = await modeloUsuarios.findOne({
            email: username,
          });
          if (!usuario) {
            return done(null, false);
          } else {
            if (!validaHash(usuario, password)) {
              return done(null, false);
            }
          }

          usuario = {
            nombre: usuario.nombre,
            email: usuario.email,
            _id: usuario._id,
          };

          return done(null, usuario);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((usuario, done) => {
    return done(null, usuario._id);
  });

  passport.deserializeUser(async (id, done) => {
    let usuario = await modeloUsuarios.findById(id);
    return done(null, usuario);
  });
};
