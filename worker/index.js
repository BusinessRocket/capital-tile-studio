// Serves the static site, sending every other address (www, the .au domain,
// the old workers.dev link, plain http) to https://capitaltilestudio.com.au.
const MAIN = 'capitaltilestudio.com.au';
const ALIASES = new Set(['www.capitaltilestudio.com.au', 'capitaltilestudio.au', 'www.capitaltilestudio.au']);

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    const isAlias = ALIASES.has(url.hostname) || url.hostname.endsWith('.workers.dev');
    if (isAlias || (url.hostname === MAIN && url.protocol === 'http:')) {
      url.hostname = MAIN;
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
