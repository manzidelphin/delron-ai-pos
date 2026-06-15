import AfricasTalking from "africastalking";

const AT = AfricasTalking({
  apiKey: process.env.AFRICAS_TALKING_API_KEY!,
  username: process.env.AFRICASTALKING_USERNAME!,
});

const sms = AT.SMS;

function formatRwandaPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("250")) return "+" + clean;
  if (clean.startsWith("0")) return "+250" + clean.slice(1);
  if (clean.startsWith("7")) return "+250" + clean;
  return "+250" + clean;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const formatted = formatRwandaPhone(to);
    await sms.send({
      to: [formatted],
      message,
      from: "DELRON",
    });
    return true;
  } catch (error) {
    console.error("SMS failed:", error);
    return false;
  }
}

export const SMS_TEMPLATES = {
  creditGiven: (
    customerName: string,
    amount: number,
    businessName: string,
    dueDate: string
  ) =>
    `Mwiriwe ${customerName}! Mwafashe ibicuruzwa bingana na ${amount.toLocaleString()} RWF kuri ${businessName}. Muzishyura tariki ya ${dueDate}. Murakoze!`,

  ownerCreditAlert: (
    customerName: string,
    phone: string,
    amount: number,
    dueDate: string
  ) =>
    `DELRON ALERT: ${customerName} (${phone}) yafashe credit ya ${amount.toLocaleString()} RWF. Azishyura: ${dueDate}.`,

  creditDueReminder: (
    customerName: string,
    amount: number,
    businessName: string
  ) =>
    `Muramutse ${customerName}! Uyu munsi ni umunsi wo kwishyura ${amount.toLocaleString()} RWF kuri ${businessName}. Murakaza neza!`,

  ownerDueReminder: (
    customerName: string,
    phone: string,
    amount: number
  ) =>
    `DELRON REMINDER: ${customerName} (${phone}) agomba kwishyura ${amount.toLocaleString()} RWF uyu munsi.`,

  ownerOverdueAlert: (
    customerName: string,
    phone: string,
    amount: number,
    daysOverdue: number
  ) =>
    `DELRON OVERDUE: ${customerName} (${phone}) ntabwo yishyuye ${amount.toLocaleString()} RWF. Iminsi ${daysOverdue} irenze!`,

  paymentConfirmed: (
    customerName: string,
    amountPaid: number,
    remaining: number,
    businessName: string
  ) =>
    remaining > 0
      ? `Murakoze ${customerName}! Twakiriwe ${amountPaid.toLocaleString()} RWF. Hasigaye ${remaining.toLocaleString()} RWF. ${businessName}.`
      : `Murakoze ${customerName}! Umwenda wose wa ${amountPaid.toLocaleString()} RWF washyuwe. ${businessName}. Murakaza neza!`,

  lowStockAlert: (
    itemName: string,
    quantity: number,
    unit: string,
    businessName: string
  ) =>
    `DELRON STOCK ALERT: ${itemName} igeze ${quantity} ${unit} gusa kuri ${businessName}. Ongera stock vuba!`,

  dailySummary: (
    businessName: string,
    yesterdayRevenue: number,
    lowStockCount: number,
    overdueCount: number
  ) =>
    `DELRON - ${businessName}: Ejo yarishyuye ${yesterdayRevenue.toLocaleString()} RWF. Stock iguye: ${lowStockCount}. Credits zirengeje: ${overdueCount}. Murakoze!`,
};
