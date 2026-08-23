const CHALLENGE_PATTERN =
  /captcha|recaptcha|hcaptcha|turnstile|challenge|verify.{0,24}human|bot.?check|cloudflare|are you a robot|security check|human verification/i;

export function looksLikeCaptchaOrChallenge(title: string, url: string): boolean {
  const combined = `${title} ${url}`.toLowerCase();
  return CHALLENGE_PATTERN.test(combined);
}
