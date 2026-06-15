declare module "africastalking" {
  interface AfricasTalkingOptions {
    apiKey: string;
    username: string;
  }

  interface SendSMSOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SMSService {
    send(options: SendSMSOptions): Promise<unknown>;
  }

  interface AfricasTalkingInstance {
    SMS: SMSService;
  }

  function AfricasTalking(options: AfricasTalkingOptions): AfricasTalkingInstance;
  export = AfricasTalking;
}
