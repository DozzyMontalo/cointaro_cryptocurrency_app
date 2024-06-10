const mongoose = require("mongoose");

const mongoDB = process.env.MONGODB_URL;
mongoose.set("strictQuery", false); //to handle deprecation error
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongoDB connection error:"));
