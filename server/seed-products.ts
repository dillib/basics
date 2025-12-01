import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating BasicsTutor products in Stripe...');

  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'basicstutor'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping creation');
    console.log('Existing products:', existingProducts.data.map(p => p.name).join(', '));
    return;
  }

  const payPerTopicProduct = await stripe.products.create({
    name: 'Single Topic Access',
    description: 'One-time access to a single learning topic with first principles breakdowns and interactive quiz',
    metadata: {
      app: 'basicstutor',
      type: 'pay_per_topic',
    },
  });
  console.log('Created product:', payPerTopicProduct.name, payPerTopicProduct.id);

  const payPerTopicPrice = await stripe.prices.create({
    product: payPerTopicProduct.id,
    unit_amount: 199,
    currency: 'usd',
    metadata: {
      app: 'basicstutor',
      type: 'pay_per_topic',
    },
  });
  console.log('Created price: $1.99 for single topic', payPerTopicPrice.id);

  const proSubscriptionProduct = await stripe.products.create({
    name: 'Pro Subscription',
    description: 'Unlimited access to all topics with advanced features, visual diagrams, and priority support',
    metadata: {
      app: 'basicstutor',
      type: 'pro_subscription',
    },
  });
  console.log('Created product:', proSubscriptionProduct.name, proSubscriptionProduct.id);

  const proMonthlyPrice = await stripe.prices.create({
    product: proSubscriptionProduct.id,
    unit_amount: 999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      app: 'basicstutor',
      type: 'pro_monthly',
    },
  });
  console.log('Created price: $9.99/month for Pro', proMonthlyPrice.id);

  console.log('\nProducts created successfully!');
  console.log('\nProduct IDs to use:');
  console.log(`Pay-per-topic Product: ${payPerTopicProduct.id}`);
  console.log(`Pay-per-topic Price: ${payPerTopicPrice.id}`);
  console.log(`Pro Subscription Product: ${proSubscriptionProduct.id}`);
  console.log(`Pro Monthly Price: ${proMonthlyPrice.id}`);
}

createProducts().catch(console.error);
