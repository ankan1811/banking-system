import Razorpay from 'razorpay';

let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return _razorpay;
}

export async function createContact(userData: {
  name: string;
  email: string;
  type?: string;
}): Promise<string | undefined> {
  try {
    // RazorpayX Contacts API — not typed in standard SDK, use direct call
    const contact = await (getRazorpay() as any).contacts?.create({
      name: userData.name,
      email: userData.email,
      type: userData.type || 'customer',
    });
    return contact?.id;
  } catch (err) {
    console.error('Creating Razorpay contact failed:', err);
    return undefined;
  }
}

export async function createTransfer(params: {
  senderBankId: string;
  receiverBankId: string;
  amount: number;
  name: string;
}): Promise<{ success: boolean; message: string }> {
  // In test/sandbox mode, transfers are recorded in the DB only.
  // Real Razorpay payouts require RazorpayX business account.
  // This function serves as a placeholder for future production integration.
  console.log(`[DEMO] Transfer: ${params.amount} from bank ${params.senderBankId} to bank ${params.receiverBankId}`);
  return { success: true, message: 'Transfer recorded (demo mode)' };
}
