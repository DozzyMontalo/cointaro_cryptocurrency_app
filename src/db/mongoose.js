const mongoose = require("mongoose");

const mongoDB = process.env.MONGODB_URL;
console.log(`Connecting to MongoDB at ${mongoDB}`);

mongoose.set("strictQuery", false); //to handle deprecation error
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongoDB connection error:"));
db.once('open', () => {
    console.log("Successfully connected to MongoDB");
});