const app=require('./app');

const connectDB=require('./src/config/db')
const seedAdmin=require('./src/utils/seedAdmin')
const seedData=require('./src/utils/seedData')
const seedDummyData=require('./src/utils/seedDummyData')

const PORT=process.env.PORT||5000;

const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(PORT,()=>
        {
            console.log(`Server running on http://localhost:${PORT}`);
        });

        await seedData();
        await seedAdmin();
        await seedDummyData();
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();