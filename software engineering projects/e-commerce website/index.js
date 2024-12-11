import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import nodemailer from "nodemailer";


let port = 3000;
let login=false;
let attempt="";
let usernameCheck="";
let admin= false;
let unique=true;
let total= 0;

const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "flowers.shopproject@gmail.com", 
    pass: "xkad xiyu wdan cjeb" 
  }
});

const db = new pg.Client({
  user:"project_db_x6k7_user",
  host:"dpg-ctcra256l47c73ciemvg-a",
  database:"project_db_x6k7",
  password:"wdVoeEiVMqMooPtzxTH8AMFmVlJyAzv0",
  port:5432,
})

db.connect();

async function usersDB() {
  const userdb= await db.query("SELECT * FROM users");
  return userdb.rows;  
};

async function ordersDB() {
  const ordersDB= await db.query("SELECT * FROM orders");
  return ordersDB.rows;  
};

async function inventoryDB() {

  const result= await db.query("SELECT * FROM inventory");
  return result.rows;  
};

//works

app.get("/", async (req, res) => {
  const inventory =await inventoryDB();
  if (login===true){
    res.render("home.ejs", { login: login , inventory:inventory, username: usernameCheck, admin:admin});
  } else{
    res.render("home.ejs", { login: login , inventory:inventory,admin:admin});
  }
});

//works 

app.get("/Login", (req, res) => {
    res.render('login.ejs', {login:login, attempt:attempt, admin:admin});
});

//works

app.post("/Login", async (req,res)=>{
  usernameCheck = req.body.username;
  let passwordCheck = req.body.password;
  const userList = await usersDB();
  const userSearch = userList.findIndex(u => u.username === usernameCheck && u.password==passwordCheck);

  if(userSearch !==-1){
    login= true;
    attempt= "success";
    if(userList[userSearch].id===0){
      admin=true;
      res.redirect("/login/admin");
    }else{
      res.redirect("/");
    }
    } else{
    attempt="failed";
    login= false;
    res.redirect("/Login");
  }

});

//works

app.get("/register", (req,res) =>{
  res.render('register.ejs', {attempt:attempt, unique:unique, login:login, admin:admin});
})

//this block works

app.post("/register", async (req, res) => {
  const user = req.body.username;
  const password = req.body.password;
  const passwordConfirm = req.body.password_confirm;
  const existingUser = await db.query("SELECT * FROM users WHERE username = $1", [user]);

  if(password===passwordConfirm && existingUser.rows.length <= 0){
    unique=true;
    attempt="";
    login=false;
    await db.query("INSERT INTO users (username ,password) VALUES($1,$2)", [user,password]);  
    res.redirect("/Login");
  } else if (existingUser.rows.length > 0 && password==passwordConfirm){
    attempt="";
    unique= false;
    login= false;
    res.redirect("/register");
  }
    else if (existingUser.rows.length <= 0 && password!=passwordConfirm){
    attempt="failed";
    unique= true;
    login=false;
    res.redirect("/register");
  } else{
    attempt="failed";
    unique= false;
    login=false
    res.redirect("/register");
  }
});


//works
app.post("/cart/:username/add", async (req,res) =>{
  const {id,count}= req.body;
  const currentUser = req.params.username;
  try{
    const fetchUserCart= await db.query("SELECT cart FROM users WHERE username = $1", [currentUser]);
    const fetchitem= await db.query("SELECT quantity FROM inventory WHERE id = $1", [req.body.id]);

    let Itemquantity = fetchitem.rows[0].quantity || [];
    let UserCart = fetchUserCart.rows[0].cart || [];
    const itemIndex = UserCart.findIndex(i => i.id === id);

    if (itemIndex !== -1) {
      UserCart[itemIndex].count += parseInt(count, 10);
    } else {
      UserCart.push({ id,count: parseInt(count, 10) });
    }
    await db.query("UPDATE users SET cart = $1 WHERE username = $2", [JSON.stringify(UserCart), currentUser]);
    await db.query("UPDATE inventory SET quantity = $1 WHERE id = $2", [parseInt(Itemquantity-count, 10), req.body.id]);
    res.redirect("/");
} catch (error) {
  console.error("Error updating cart:", error);
  res.status(500).send("An error occurred while updating the cart");
}  
});


app.get("/login/admin", async (req,res)=>{
  const inventory =await inventoryDB();
  res.render("adminAccess.ejs", {inventory:inventory, login:login, admin:admin})

})

//loggingout
//done

app.post("/logout",(req,res)=>{
  login=false;
  admin=false;
  res.redirect("/");
})

//page to get info for new item admin wants to add to the database
//works
app.get("/login/admin/newItem", (req,res)=>{
  res.render("adminNewItem.ejs",{login:login, admin:admin});

})

//processing the new item admin added into the database 
//works
app.post("/login/admin/newItem", async(req,res)=>{
  let name= req.body.name;
  let price= req.body.price;
  let quantity= req.body.quantity;
  let description= req.body.description;
  let svg= req.body.svg;

  try{
    await db.query("INSERT INTO inventory (name ,price,quantity,description,svg) VALUES($1,$2,$3,$4,$5)", [name,price,quantity,description,svg]);  
    res.redirect("/login/admin");
  }catch(err) {
    console.error("Error inserting new item:", err);
    res.status(500).send("An error occurred while inserting the item you want to the table.");
  }
  
})

//when admin selects item to edit
//works

app.get("/login/admin/edit/:id", async(req,res)=>{
  const inventory =await inventoryDB();
  const id= req.params.id;
  try {
    const fetchItem= await db.query("SELECT * FROM inventory WHERE id = $1", [id]);
    res.render("adminEdit.ejs", {item:fetchItem.rows[0], login:login, admin:admin})
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).send("An error occurred while fetching the item you want to edit.");
  }
})

//processing the edits the admin made to a certain item
//works

app.post("/login/admin/edit/:id", async(req,res)=>{
  const id= req.params.id;
  const name= req.body.name;
  const price= req.body.price;
  const quantity= req.body.quantity;
  const description= req.body.description;

  try{
  await db.query("UPDATE inventory SET name = $1, price =$2, quantity=$3, description=$4 WHERE id = $5", [name,price, quantity, description, id]);
  res.redirect("/login/admin");
  } catch (error) {
  console.error("Error updating inventory:", error);
  res.status(500).send("An error occurred while updating the inventory");
}  
})

//deletes item from inventory using admin access
//works

app.post("/login/admin/delete/:id", async (req,res)=>{
  const id = req.params.id;
  try {
    await db.query("DELETE FROM inventory WHERE id = $1", [id]);
    res.redirect("/login/admin");
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).send("An error occurred while deleting the item.");
  }
})

//getting the checkoutpage for the user where they can see their total

app.get("/cart/:username/checkout", async(req,res)=>{
  const inventory =await inventoryDB();
  const currentUser = req.params.username;
  try{
    const fetchUserCart= await db.query("SELECT cart FROM users WHERE username = $1", [currentUser]);
    let UserCart = fetchUserCart.rows[0].cart || [];

    res.render("cart.ejs",{cart:UserCart, login:login,admin:admin,inventory:inventory,username:currentUser});
} catch (error) {
  console.error("Error fetching cart:", error);
  res.status(500).send("An error occurred while fetching the cart");
}})

//the post request that will process the users order 
//it will remove what they selected from inventory
//or return what they ended up not getting to the inventory 
//and send me an email
//works
app.post("/cart/:username/checkout", async(req,res)=>{
  const inventory =await inventoryDB();
  const cartData = JSON.parse(req.body.cartData); 
  const originalCart= JSON.parse(req.body.originalCart); 
  const currentUser = req.params.username;
  await db.query('INSERT INTO orders ("user", "order") VALUES($1, $2)', [currentUser,JSON.stringify(cartData)]);  
  await db.query("UPDATE users SET cart = $1 WHERE username = $2", [null, currentUser]);
  for (let i of cartData) {
    let item = inventory.findIndex(inv => inv.id == i.id);
    let original = originalCart.findIndex(count => count.id == i.id);
    let newquantity = inventory[item].quantity - (i.count - originalCart[original].count);
    await db.query("UPDATE inventory SET quantity = $1 WHERE id = $2", [newquantity, i.id]);
  }
  const mailOptions = {
    from: "flower.shop.project@gmail.com",
    to: "ingyomar906@gmail.com",
    subject: "Order Confirmation",
    text: `Someone made an order :)`
  };

  await transporter.sendMail(mailOptions);
  res.redirect("/");
  
})

app.get("/about", (req,res)=>{
  res.render("contact.ejs", {login:login,admin:admin});

})

//works

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
