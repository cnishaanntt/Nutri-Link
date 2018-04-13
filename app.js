//const https = require('https');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const genomeLink = require('genomelink-node');
const scraper = require('table-scraper');
const path = require('path');
const pug = require('pug');
const request = require('request');

const app = express();
app.use(express.static('www'));

/*var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
*/
app.set('view engine', 'pug'); 
app.set('views', path.join(__dirname, '/www/pug'));

app.use(session({
  secret: 'Your secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 60 * 1000
  }
}));

//The nutrients are converted to USDA reference number
var refno = name =>{
    if (name == 'VitaminA'){
        return 320;
    } else if  (name == 'VitaminB12'){
        return 418;
    } else if  (name == 'VitaminD'){
        return 328;
    } else if  (name == 'VitaminE'){
        return 573;
    } else if  (name == 'Proteinintake'){
        return 203;
    } else if  (name == 'Carbohydrateintake'){
        return 205;
    } else if  (name == 'Beta-carotene'){
        return 321;
    } else if  (name == 'Calcium'){
        return 301;
    } else if  (name == 'Folate'){
        return 417;
    } else if  (name == 'Iron'){
        return 303;
    } else if  (name == 'Magnesium'){
        return 304;
    } else if  (name == 'Phosphorus'){
        return 305;
    } else if  (name == 'Motionsickness'){
        return 291;
    }  
}

var redirect = (req,res) =>{
    req.session.redirectTo=req.originalUrl;   
    res.redirect('/');       
}

app.get('/', async (req, res) => {
  const scope = 'report:vitamin-a report:vitamin-b12 report:vitamin-d report:vitamin-e report:protein-intake report:carbohydrate-intake report:beta-carotene report:calcium report:folate report:iron report:magnesium report:phosphorus report:motion-sickness';
  const authorizeUrl = genomeLink.OAuth.authorizeUrl({ scope: scope });
  res.render('index', {
    authorize_url: authorizeUrl,
  });
});

app.get('/callback', async (req, res) => {
  // The user has been redirected back from the provider to your registered
  // callback URL. With this redirection comes an authorization code included
  // in the request URL. We will use that to obtain an access token.
  req.session.oauthToken = await genomeLink.OAuth.token({ requestUrl: req.url });

  // At this point you can fetch protected resources but lets save
  // the token and show how this is done from a persisted token in index page.
  res.redirect('/summary');
});

app.get('/summary', async (req, res) => {
  const scope = 'report:vitamin-a report:vitamin-b12 report:vitamin-d report:vitamin-e report:protein-intake report:carbohydrate-intake report:beta-carotene report:calcium report:folate report:iron report:magnesium report:phosphorus report:motion-sickness';
  // Fetching a protected resource using an OAuth2 token if exists.
  let reports = [];
  if (req.session.oauthToken) {
    const scopes = scope.split(' ');
    reports = await Promise.all(scopes.map( async (name) => {
      return await genomeLink.Report.fetch({
        name: name.replace(/report:/g, ''),
        population: 'european',
        token: req.session.oauthToken
      });
    }));
    res.render('summary', {
        reports: reports
    });
  } else {
      redirect(req, res);
  }
})

app.get('/go',async(req, res) =>{  
    var tableData=[];
    if (req.session.oauthToken) {  
        // Scraping USDA Nutrient database with nutrient sort
        scraper
          .get('https://ndb.nal.usda.gov/ndb/nutrients/report/nutrientsfrm?max=10&offset=0&totCount=0&nutrient1=' + refno(req.query.name) + '&nutrient2=&nutrient3=&subset=0&sort=c&measureby=m')
          .then(function(tableData) {
            try {
                   JSON.parse(JSON.stringify(tableData));
                } catch (e) {
                    return console.error(e);
                }
            res.render('recommender',{
            score:req.query.score,
            name:req.query.name,
            item:tableData
            })
        });
    } else {
        redirect(req,res);
    }
});

app.get('/nutrient',async(req, res) =>{ 
    var num=req.query.num
    if (req.session.oauthToken) { 
        request({
            url: 'https://api.nal.usda.gov/ndb/reports/?ndbno='+num+'&type=b&format=json&api_key=G8dZT37oNKQBFL1jI3wBb0k0GcEbcGLXM77redC7',
            json: true
        }, function (error, response, foodContent,num) {
            if (!error && response.statusCode === 200) {
                //console.log(foodContent) 
                res.render('nutrient',{
                    foodContent:foodContent,
                    num:num
                })  
            }
        })
    } else {
        redirect(req,res);
    }
});


// Run local server on port 3000.
const port = process.env.PORT || 3000;
//const server = https.createServer(options,app);
const server = app.listen(port,function(){      
//server.listen(port, function () {
//console.log('Server running at http://127.0.0.1:' + port + '/');
});
