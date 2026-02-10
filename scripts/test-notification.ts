import { sendMessage } from '../src/services/whatsapp.service';

const testNotification = async () => {
    console.log('🚀 Testing Notification Service Integration...');

    // Replace with your number if you want to receive it
    const target = '082131077460';
    const message = 'Hello from Java Microservice Integration Test!';

    const result = await sendMessage(target, message);

    if (result.success) {
        console.log('✅ Integration Test PASSED!');
        console.log('Java Service Response:', result.data);
    } else {
        console.error('❌ Integration Test FAILED.');
        console.error('Error:', result.message);
    }
};

testNotification();
