const PORT = 8080;

const express = require("express");

let app = express();

app.use(express.static("./"));

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
