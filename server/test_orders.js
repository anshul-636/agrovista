const mongoose = require('mongoose');
const User = require('./src/models/User');
const Order = require('./src/models/Order');

async function test() {
  await mongoose.connect('mongodb+srv://anshul-636:OububD7E2p2d5LzZ@cluster0.puf3b.mongodb.net/agrovista?retryWrites=true&w=majority');
  console.log('Connected');
  
  const buyer = await User.findOne({ role: 'BUYER' });
  console.log('Buyer:', buyer ? buyer.name : 'None');
  
  const orders = await Order.find({ buyer: buyer._id })
        .populate('product', 'name images unit')
        .populate('farmer', 'name avatar')
        .sort({ createdAt: -1 });
        
  console.log('Orders found:', orders.length);
  if(orders.length > 0) {
    console.log(orders[0]);
  }
  
  mongoose.disconnect();
}
test().catch(console.error);
