/*(Importación modulos)*/
const express = require("express"); /**Ejecutar en el pc */
const {cyan, bgRed, yellow} = require("chalk"); /* Colores*/
const listen = require("socket.io"); /**Aplicacion sea bidireccional */
const MongoClient = require('mongodb').MongoClient; /**Conectar con la base de datos  */
const {AttributeIds, OPCUAClient, TimestampsToReturn} = require("node-opcua");

/**Creacion de constantes para la comunicación */
const endpointUrl = "opc.tcp://DESKTOP-MR81MKN:4840"; //Cpnexion codesys
const nodeIdToMonitor = "ns=4;s=|var|CODESYS Control Win V3 x64.Application.GVL.nivel"; // conex var
const nodeIdToMonitor2 = "ns=4;s=|var|CODESYS Control Win V3 x64.Application.GVL.temp"; //*****************

//Aplicacion web
const port = 3700; // Puerto local
const uri = "mongodb+srv://Rosulen:123angie@reactor.hjc4d.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const clientmongo = new MongoClient (uri, {useNewUrlParser: true});

/**Codigo principal */
(async () =>{
    try{
        const client = OPCUAClient.create();
        client.on("backoff", (retry, delay) => {
            console.log("Retrying to connect to ", endpointUrl, 
            " attempt", retry);
        });
        console.log(" connecting to", cyan(endpointUrl)); /**Intentar conexion a la url */
        await client.connect(endpointUrl); // No siga el codigo hasta la conexión
        //console.log(" connected to ", cyan(endpointUrl));

        /**Interactuar con la conexion */
        const session = await client.createSession();
        //console.log("Sesion iniciada".yellow);
        const subscription = await session.createSubscription2({
            requestedPublishingInterval: 200, // publicar solicitud 200 ms
            requestedMaxKeepAliveCount: 20,
            publishingEnabled: true,
        });
        
        // Iniciar el monitoreo dela variables
        const itemToMonitor = {
            nodeId: nodeIdToMonitor, //Variable a monitorear
            attributeId: AttributeIds.Value
        };

///////////////////////////////////////////////////////////////////77

        const itemToMonitor2 = {
            nodeId: nodeIdToMonitor2, //Variable a monitorear
            attributeId: AttributeIds.Value
        };
    
///////////////////////////////////////////////////////////////////
        const parameters = {
            samplingInterval: 50, //tiempo de muestreo
            discardOldest: true,
            queueSize: 100
        };

        const monitoredItem = await subscription.monitor(itemToMonitor, parameters, TimestampsToReturn.Both)
        const monitoredItem2 = await subscription.monitor(itemToMonitor2, parameters, TimestampsToReturn.Both) //************
        
        // Crear aplicaciónconst
        const app = express();
        app.set("view engine", "html");
        app.use(express.static(__dirname + '/'));
        app.set('views', __dirname + '/');

        app.get("/", function(req, res){
            res.render('index.html');
        });
        const io = listen(app.listen(port));
        
        io.sockets.on('connection', function(socket){});

        console.log("Listening on port " + port);
        console.log("visit http://localhost:" + port);

        await clientmongo.connect();

        const collection = clientmongo.db("mydb").collection("myocollection");
        console.log("1");
        monitoredItem.on("changed", (dataValue) => {
            
            collection.insertOne({ 
                Nivel: dataValue.value.value,
                time: dataValue.serverTimestamp
            });
            console.log("Valor" + valor);
            io.sockets.emit("message", {
                value: dataValue.value.value,
                timestamp: dataValue.serverTimestamp,
                nodeId: nodeIdToMonitor,
                browseName: "Nombre"            
                });
            
        });

////////////////////////////////////////////////

        monitoredItem2.on("changed", (dataValue) => {
                    
            collection.insertOne({ 
                Temperatura: dataValue.value.value,
                time: dataValue.serverTimestamp
            });
            console.log("Valor" + valor);
            io.sockets.emit("message", {
                value: dataValue.value.value,
                timestamp: dataValue.serverTimestamp,
                nodeId: nodeIdToMonitor2,
                browseName: "Nombre"            
                });
            
        });

//////////////////////////////////////////////////
        let running = true;
        process.on("SIGINT", async () =>{   
            if (!running){
                return;
            }
            console.log("shutting down client");
            running = false;
            await clientmongo.close();
            await subscription.terminate();
            await session.close();
            await client.disconnect();
            console.log("Done");
            process.exit(0);
        });
    }

    catch (err) {
        console.log(bgRed.white("Error" + err.message));
        console.log(err);
        process.exit(-1);
    }
})();