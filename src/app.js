import express from 'express';
import {engine} from 'express-handlebars'
import __dirname from './utils.js'
import path from 'path';
import routerApi from './dao/managerdb.js'
import { router as viewRouter } from './routes/view.router.js';
import {Server} from 'socket.io'
import session from 'express-session';
import ConnectMongo from 'connect-mongo'
import { router as sessionsRouter} from './routes/sessions.router.js';
import { inicializaPassport } from './config/passport.config.js';
import passport from 'passport';

const PORT=8080
export const BASE_URL = `http://localhost:${PORT}`
const app=express()



app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname,'/views'));

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(express.static(path.join(__dirname,'/public')))
app.use('/api', routerApi)

app.use(session({
  secret: 'claveSecreta',
  resave: true, saveUninitialized: true,
  store: ConnectMongo.create({
    mongoUrl:"mongodb+srv://kaufmannEcommerce:kaufmannEcommerce@kaufmanndb.wakqh7a.mongodb.net/?retryWrites=true&w=majority&dbName=KaufmannDB",
    ttl: 3600
  })
}))

inicializaPassport()
app.use(passport.initialize())
app.use(passport.session())

app.use('/', viewRouter)
app.use('/api/sessions', sessionsRouter)


app.get('*',(req, res)=>{
    res.send('Error 404 - Page not found')
})

const serverExpress = app.listen(PORT, ()=>{
    console.log(`Server corriendo en puerto ${PORT}`)
})


const serverSocket=new Server(serverExpress)
app.locals.io = serverSocket; 

serverSocket.on('connection', (socket) => {
    console.log(`Se ha conectado un cliente con id ${socket.id}`)

    
serverSocket.on ('message', data =>{
    console.log (data)
  })

  
socket.on('id', email=>{
    console.log(`se ha conectado el usuario ${email}`),
    mensajes.push ({
      user:'server',
      message:'Bienvenido al chat'
    });
    usuarios.push ({id: socket.id, usuario: email});
    socket.emit ('bienvenida', mensajes);
    socket.broadcast.emit ('nuevoUsuario', email);
    mensajes.pop();
    
  })
  
  socket.on('nuevoMensaje', mensaje =>{
    mensajes.push(mensaje);
    io.emit ('llegoMensaje', mensaje);
    const newmessage = new chatModel({
      user: mensaje.user, 
      message: mensaje.message
    });
    
    newmessage.save()
      .then(() => {
        console.log('Nuevo mensaje guardado con éxito:');
      })
      .catch((error) => {
        console.error('Error al guardar el mensaje:', error);
      });
    
  })

    socket.on('identificacion',nombre=>{
        console.log(`Se ha conectado ${nombre}`)
        socket.emit('idCorrecto',{message:`Hola ${nombre}, bienvenido...!!!`})
        socket.broadcast.emit('nuevoUsuario', nombre)

    })
   
    socket.on('nuevoProducto', async (newProduct) => {
        await fetch('http://localhost:8080/api/products', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newProduct),
        })
        
        serverSocket.emit('actualizar');
    
    })

    
    socket.on('eliminarProducto', async (id) => {
        await fetch(`http://localhost:8080/api/products/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        })
        serverSocket.emit('actualizar');
    
    })

    socket.on('bienvenida', () => {
        console.log("Bienvenido!")
    })

})
