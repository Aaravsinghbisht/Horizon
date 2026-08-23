export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const currency = process.env.RAZORPAY_CURRENCY?.trim() || "INR";

  return {
    keyId,
    keySecret,
    currency,
    configured: Boolean(keyId && keySecret),
  };
}
