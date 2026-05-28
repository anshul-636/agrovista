const http = require('http');

http.get('http://localhost:3002/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Basic parse
    const titleMatch = data.match(/<title>(.*?)<\/title>/is);
    console.log('TITLE:', titleMatch ? titleMatch[1] : 'No title');
    
    // Grab the script containing the error
    if(data.includes('Hydration failed') || data.includes('Internal Server Error')) {
      console.log('Got standard Next.js error HTML page.');
      const errMatch = data.match(/data-nextjs-error=.*?>(.*?)<\//is);
      if(errMatch) console.log('ERROR TEXT:', errMatch[1].substring(0, 500));
      
      const snippet = data.match(/Error:.*?\n/i);
      if(snippet) console.log('SNIPPET:', snippet[0]);
    }
    
    if(data.trim() === "missing required error components, refreshing...") {
       console.log('Got the missing required error components message!');
    }
  });
}).on('error', err => {
  console.log('Fetch error:', err.message);
});
