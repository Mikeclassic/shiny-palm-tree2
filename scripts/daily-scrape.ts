// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const TARGET_STORES = [
    "https://www.fashionnova.com",
    "https://princesspolly.com",
    "https://ohpolly.com",
    "https://whitefoxboutique.com",
    "https://meshki.us",
    "https://houseofcb.com",
    "https://boandtee.com",
    "https://us.loungeunderwear.com",
    "https://skinnydiplondon.com",
    "https://gymshark.com",
    "https://alphaleteathletics.com",
    "https://shop.lululemon.com",
    "https://colourpop.com",
    "https://blackmilkclothing.com",
    "https://iheartraves.com",
    "https://aelfriceden.com",
    "https://www.emmiol.com",
    "https://peppermayo.com",
    "https://hellomolly.com",
    "https://saboskirt.com",
    "https://beginningboutique.com",
    "https://vergegirl.com",
    "https://showpo.com",
    "https://petalandpup.com",
    "https://reddress.com",
    "https://pinklily.com",
    "https://tigermist.com",
    "https://iamgia.com",
    "https://mistressrocks.com",
    "https://adanola.com",
    "https://wearetala.com",
    "https://setactive.co",
    "https://frankiesbikinis.com",
    "https://blackboughswim.com",
    "https://kulanikinis.com",
    "https://balibodyco.com",
    "https://cocoandeve.com",
    "https://luxyhair.com",
    "https://bellamihair.com",
    "https://insertnamehere.com",
    "https://glamnetic.com",
    "https://doeBushes.com",
    "https://starface.world",
    "https://trulybeauty.com",
    "https://rhodefuture.com",
    "https://kyliecosmetics.com",
    "https://kkwbeauty.com",
    "https://moonjuice.com",
    "https://golde.co",
    "https://blume.com",
    "https://getmaude.com",
    "https://modernferility.com",
    "https://ritua.com",
    "https://seed.com",
    "https://beamtlc.com",
    "https://mudwtr.com",
    "https://magicspoon.com",
    "https://flybyjing.com",
    "https://brightland.co",
    "https://greatjonesgoods.com",
    "https://ourplace.com",
    "https://carawayhome.com",
    "https://materialkitchen.com",
    "https://madeincookware.com",
    "https://fellowproducts.com",
    "https://brooklinen.com",
    "https://parachutehome.com",
    "https://bollandbranch.com",
    "https://buffy.co",
    "https://helixsleep.com",
    "https://casper.com",
    "https://burrow.com",
    "https://floydhome.com",
    "https://article.com",
    "https://polyandbark.com",
    "https://interioricons.com",
    "https://ruggable.com",
    "https://revivalrugs.com",
    "https://boutiquerugs.com",
    "https://thesill.com",
    "https://bloomscape.com",
    "https://bouqs.com",
    "https://urbanstems.com",
    "https://farmgirlflowers.com",
    "https://wildone.com",
    "https://fablepets.com",
    "https://maxbone.com",
    "https://tuftandpaw.com",
    "https://catperson.com",
    "https://smalls.com",
    "https://nomnomnow.com",
    "https://farmersdog.com",
    "https://ollie.com",
    "https://spotandtango.com",
    "https://jinx.co",
    "https://sundaysfordogs.com",
    "https://openfarmpet.com",
    "https://shop.chomps.com",
    "https://epicprovisions.com",
    "https://kettleandfire.com",
    "https://primalon.com",
    "https://bulletproof.com",
    "https://foursigmatic.com",
    "https://supercoffee.com",
    "https://risebrewingco.com",
    "https://wanderingbearcoffee.com",
    "https://jot.co",
    "https://cometeer.com",
    "https://drinktrade.com",
    "https://bluebottlecoffee.com",
    "https://stumptowncoffee.com",
    "https://intelligentsia.com",
    "https://vervecoffee.com",
    "https://lacolombe.com",
    "https://equatorcoffees.com",
    "https://counterculturecoffee.com",
    "https://onyxcoffeelab.com",
    "https://georgehowellcoffee.com",
    "https://ptscoffee.com",
    "https://birdrockcoffee.com",
    "https://klatchroasting.com",
    "https://dragonflycoffeeroasters.com",
    "https://jbc-coffee-roasters.myshopify.com",
    "https://paradise-coffee-roasters.myshopify.com",
    "https://willoughbyscoffee.com",
    "https://barringtoncoffee.com",
    "https://kuma-coffee.myshopify.com",
    "https://olympiacoffee.com",
    "https://noblecoffeeroasting.com",
    "https://spyhousecoffee.com",
    "https://coavacoffee.com",
    "https://heartroasters.com",
    "https://wateravenuecoffee.com",
    "https://nossacoffee.com",
    "https://casecoffeeroasters.com",
    "https://roselinecoffee.com",
    "https://sterling.coffee",
    "https://upperleftroasters.com",
    "https://goodcoffeepdx.com",
    "https://extracto.com",
    "https://spella.com",
    "https://kainoscoffeepdx.com",
    "https://pulpandcircumstance.com",
    "https://riflepaperco.com",
    "https://papersource.com",
    "https://minted.com",
    "https://artifactuprising.com",
    "https://papier.com",
    "https://moleskine.com",
    "https://baronfig.com",
    "https://karststonepaper.com",
    "https://fieldnotesbrand.com",
    "https://appointed.co",
    "https://clothandpaper.com",
    "https://ugmonk.com",
    "https://grovemade.com",
    "https://orbitkey.com",
    "https://bellroy.com",
    "https://nomadgoods.com",
    "https://peakdesign.com",
    "https://moment.com",
    "https://shop.hodinkee.com",
    "https://wornandwound.com",
    "https://windupwatchshop.com",
    "https://teddybaldassarre.com",
    "https://mvmt.com",
    "https://vincero.com",
    "https://originalgrain.com",
    "https://treehut.co",
    "https://holzkern.com",
    "https://nordgreen.com",
    "https://linjer.co",
    "https://filippo-loreti.com",
    "https://danielwellington.com",
    "https://cluse.com",
    "https://rosefieldwatches.com",
    "https://paul-valentine.com",
    "https://abbottlyon.com",
    "https://astridandmiyu.com",
    "https://missoma.com",
    "https://monicavinader.com",
    "https://daisyjewellery.com",
    "https://edgeofember.com",
    "https://otiumberg.com",
    "https://pdpaola.com",
    "https://mejuri.com",
    "https://gorjana.com",
    "https://baublebar.com",
    "https://kendrascott.com",
    "https://alexandani.com",
    "https://pandora.net", 
    "https://swarovski.com",
    "https://tiffany.com", 
    "https://cartier.com",
    "https://vancleefarpels.com",
    "https://bulgari.com",
    "https://chopard.com",
    "https://davidyurman.com",
    "https://johnhardy.com",
    "https://lagos.com",
    "https://ippolita.com",
    "https://marcobicego.com",
    "https://robertocoin.com",
    "https://mikimoto.com",
    "https://tasaki-global.com",
    "https://boucheron.com",
    "https://chaumet.com",
    "https://fred.com",
    "https://messika.com",
    "https://dinhvan.com",
    "https://poiray.com",
    "https://mauboussin.com",
    "https://korloff.com",
    "https://akillis.com",
    "https://djula.fr",
    "https://aureliebidermann.com",
    "https://gasbijoux.com",
    "https://lesgeorgettes.com",
    "https://hipanema.com",
    "https://clioblue.com",
    "https://agatha.fr",
    "https://reminiscence.fr",
    "https://satellite.paris",
    "https://nature.fr",
    "https://taratata-bijoux.com",
    "https://lolaandgrace.com",
    "https://brosway.com",
    "https://morellato.com",
    "https://nomination.com",
    "https://unoaerre.it",
    "https://pomellato.com",
    "https://doppogio.com",
    "https://damiani.com",
    "https://salvini.com",
    "https://bliss.it",
    "https://calderoni.com",
    "https://roccobarocco.it",
    "https://liujo.com",
    "https://guess.eu",
    "https://fossil.com",
    "https://skagen.com",
    "https://michaelkors.com",
    "https://armani.com",
    "https://diesel.com",
    "https://police.it",
    "https://sectornolimits.com",
    "https://maseratiwatch.com",
    "https://trussardi.com",
    "https://furla.com",
    "https://coccinelle.com",
    "https://thebridge.it",
    "https://piquadro.com",
    "https://tuscanyleather.it",
    "https://pratesi.com",
    "https://ilbisonte.com",
    "https://campomaggi.com",
    "https://giannichiarini.com",
    "https://gum-design.com",
    "https://savemybag.it",
    "https://o-bag.it",
    "https://carpisa.it",
    "https://seguet.it",
    "https://camomillaitalia.com",
    "https://accessroize.com",
    "https://claires.com",
    "https://icing.com",
    "https://lovisa.com",
    "https://colettehayman.com",
    "https://mimco.com.au",
    "https://oroton.com",
    "https://statusanxiety.com",
    "https://nakedvice.com.au",
    "https://thedailyedited.com",
    "https://monpurse.com",
    "https://maison-de-sabre.com",
    "https://casetify.com",
    "https://burga.com",
    "https://idealofsweden.com",
    "https://richmondfinch.com",
    "https://holdit.com",
    "https://nudient.com",
    "https://peel.com",
    "https://totalleecase.com",
    "https://latercase.com",
    "https://pitakacarbon.com",
    "https://mous.co",
    "https://rhinoshield.io",
    "https://dbrand.com",
    "https://slickwraps.com",
    "https://skinit.com",
    "https://decalgirl.com",
    "https://gelaskins.com",
    "https://society6.com",
    "https://redbubble.com",
    "https://teepublic.com",
    "https://threadless.com",
    "https://designbyhumans.com",
    "https://lastexittonowhere.com",
    "https://qwertee.com",
    "https://riptapparel.com",
    "https://shirtoid.com",
    "https://teefury.com",
    "https://theyetee.com",
    "https://fangamer.com",
    "https://eightysixed.com",
    "https://sanshee.com",
    "https://insertcoinclothing.com",
    "https://musterbrand.com",
    "https://jinx.com",
    "https://glitchgear.com",
    "https://thinkgeek.com",
    "https://boxlunch.com",
    "https://hottopic.com",
    "https://spencersonline.com",
    "https://zumiez.com",
    "https://tillys.com",
    "https://pacsun.com",
    "https://urbanoutfitters.com",
    "https://anthropologie.com",
    "https://freepeople.com",
    "https://modcloth.com",
    "https://unique-vintage.com",
    "https://topvintage.net",
    "https://collectif.co.uk",
    "https://hellbunny.com",
    "https://voodoovixen.co.uk",
    "https://lindy-bop.com",
    "https://dollyanddotty.co.uk",
    "https://britishretro.co.uk",
    "https://vivienofholloway.com",
    "https://theprettydresscompany.com",
    "https://ladyvlondon.com",
    "https://miss-candyfloss.com",
    "https://emmydesign.se",
    "https://rocketoriginals.co.uk",
    "https://remixvintage.com",
    "https://whatkatiedid.com",
    "https://secretsinlace.com",
    "https://playfulpromises.com",
    "https://bluebella.com",
    "https://agentprovocateur.com",
    "https://honeybirdette.com",
    "https://bordelle.co.uk",
    "https://studio-pia.com",
    "https://fleurdumal.com",
    "https://kikidm.com",
    "https://coco-de-mer.com",
    "https://myla.com",
    "https://damaris.co.uk",
    "https://mimiholliday.com",
    "https://gildapearl.co.uk",
    "https://carinegilson.com",
    "https://laperla.com",
    "https://wolford.com",
    "https://falke.com",
    "https://fogal.com",
    "https://kunert.de",
    "https://hudson.com",
    "https://burlington.de",
    "https://calzedonia.com",
    "https://intimissimi.com",
    "https://tezenis.com",
    "https://oysho.com",
    "https://etau.com",
    "https://undiz.com",
    "https://hunkemoller.com",
    "https://livera.nl",
    "https://sapph.com",
    "https://marliesdekkers.com",
    "https://primadonna.com",
    "https://mariejo.com",
    "https://chantelle.com",
    "https://passionata.com",
    "https://aubade.com",
    "https://lisecharmel.com",
    "https://simone-perele.com",
    "https://maisonlejaby.com",
    "https://lou-paris.com",
    "https://vanityfairlingerine.com",
    "https://bestform.com",
    "https://playtex.com",
    "https://wonderbra.com",
    "https://shockabsorber.co.uk",
    "https://panache-lingerie.com",
    "https://freya.com",
    "https://fantasie.com",
    "https://elomi.com",
    "https://goddess.com",
    "https://curvykate.com",
    "https://scantilly.com",
    "https://parfaitlingerie.com",
    "https://natoricompany.com",
    "https://wacoal-america.com",
    "https://b-temptd.com",
    "https://elila.com",
    "https://rago-shapewear.com",
    "https://squeem.com",
    "https://vedette.com",
    "https://annchery.com.co",
    "https://shapeager.com",
    "https://leonisa.com",
    "https://spanx.com",
    "https://yummie.com",
    "https://maidenform.com",
    "https://flexees.com",
    "https://assets.com",
    "https://commando.com",
    "https://tc-shapewear.com",
    "https://miraclesuit.com",
    "https://magicsuit.com",
    "https://trina-turk.com",
    "https://nanettelepore.com",
    "https://normakamali.com",
    "https://gottex-swimwear.com",
    "https://profilebygottex.com",
    "https://maryanmehlhorn.com",
    "https://shan.ca",
    "https://vitaminaswim.com",
    "https://lspaceswim.com",
    "https://vixta.com",
    "https://sofiabyvix.com",
    "https://paulandjoe.com",
    "https://eresparis.com",
    "https://solidandstriped.com",
    "https://marysia.com",
    "https://lisamariefernandez.com",
    "https://flagpole.com",
    "https://onias.com",
    "https://orlebarbrown.com",
    "https://vilebrequin.com",
    "https://sundek.us",
    "https://birdwell.com"
];

async function main() {
  console.log(`🔥 Starting Massive Spy Protocol on ${TARGET_STORES.length} stores...`);
  
  let newProducts = 0;
  let skippedProducts = 0;

  // Shuffle stores to ensure variety even if script times out
  const shuffledStores = TARGET_STORES.sort(() => 0.5 - Math.random());

  for (const storeUrl of shuffledStores) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); 

        // 1. Get Best Sellers HTML
        const htmlRes = await fetch(`${storeUrl}/collections/all?sort_by=best-selling`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        }).catch(() => null);
        
        clearTimeout(timeoutId);

        if (!htmlRes || !htmlRes.ok) continue;

        const html = await htmlRes.text();
        const $ = cheerio.load(html);

        // 2. Find Handles
        const productHandles = new Set<string>();
        $('a[href*="/products/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                const handle = href.split('/products/')[1]?.split('?')[0];
                if (handle) productHandles.add(handle);
            }
        });

        // 3. INCREASED LIMIT TO 5 ITEMS
        const topHandles = Array.from(productHandles).slice(0, 5);

        if(topHandles.length > 0) process.stdout.write(`\n${storeUrl.replace('https://', '')}: `);

        for (const handle of topHandles) {
            const productUrl = `${storeUrl}/products/${handle}`;
            
            // Deduplication
            const exists = await prisma.product.findFirst({
                where: { sourceUrl: productUrl }
            });

            if (exists) {
                process.stdout.write("-"); 
                skippedProducts++;
                continue;
            }

            // Fetch Details
            const jsonUrl = `${storeUrl}/products/${handle}.json`;
            const productRes = await fetch(jsonUrl);
            if (!productRes.ok) continue;

            const data = await productRes.json();
            const item = data.product;

            if (!item || !item.images || item.images.length === 0) continue;

            const isAvailable = item.variants.some((v: any) => v.available === true);

            // EXTRACT RAW HTML DESCRIPTION
            // We use cheerio to strip <p> and <br> tags for clean text storage
            const rawHtml = item.body_html || "";
            const $desc = cheerio.load(rawHtml);
            const cleanDescription = $desc.text().trim() || item.title;

            // Save
            await prisma.product.create({
                data: {
                    title: item.title,
                    price: parseFloat(item.variants?.[0]?.price || "0"),
                    imageUrl: item.images[0].src,
                    sourceUrl: productUrl,
                    aesthetic: "Trending 🔥",
                    
                    // METADATA FROM JSON
                    vendor: item.vendor,
                    productType: item.product_type,
                    tags: item.tags, // Assumes String[] in Prisma
                    isSoldOut: !isAvailable,
                    publishedAt: new Date(item.published_at),
                    
                    // NEW: RAW DESCRIPTION
                    originalDesc: cleanDescription
                }
            });
            process.stdout.write("+"); 
            newProducts++;
        }
    } catch (e) {
        // Ignore errors
    }
  }

  console.log(`\n\n✅ JOB DONE: Added ${newProducts} products. Skipped ${skippedProducts} duplicates.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });