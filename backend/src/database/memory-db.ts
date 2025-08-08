import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export async function setupMemoryDatabase() {
  const mongod = new MongoMemoryServer();
  await mongod.start();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri);
  console.log('Connected to in-memory MongoDB');
  
  return mongod;
}
