import { mkdirSync, writeFileSync } from 'node:fs';

// Original SVG drawings for HOME CONNECT. No external artwork or icon fonts.
const box = (x,y,w,h,fill='#fff',r=5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const line = (x,y,a,b) => `<path d="M${x} ${y}L${a} ${b}"/>`;
const path = d => `<path d="${d}"/>`;
const circle = (x,y,r,fill='#fff') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const house = `${path('M75 130L180 45L285 130')}${box(100,130,160,125)}${box(160,185,40,70,'#fde3e3')}`;
const pipes = `${path('M100 80V155H220V235M100 100H75M220 210H250')}${box(145,140,30,30,'#fde3e3')}`;
const window = `${box(100,70,160,170)}${line(180,70,180,240)}${line(100,155,260,155)}`;
const cabinet = `${box(80,100,200,145)}${line(180,100,180,245)}${circle(160,170,4,'#e00707')}${circle(200,170,4,'#e00707')}`;
const tiles = (x=95,y=90,rows=3,cols=4) => Array.from({length:rows*cols},(_,i)=>box(x+i%cols*43,y+Math.floor(i/cols)*43,36,36,i%3===0?'#fde3e3':'#fff',2)).join('');
const drawings = {
  roofing: `${house}${path('M90 115H270M115 95H245M140 75H220M130 95V115M175 75V95M215 95V115')}`,
  plumbing: `${pipes}${path('M70 205H150L140 225H80Z')}${path('M110 205V185H130V195')}`,
  hvac: `${box(70,110,155,130)}${circle(145,175,45)}${path('M145 135C175 135 175 170 145 175C115 175 110 210 145 215M105 175C105 145 140 145 145 175C145 205 180 210 185 175')}${path('M250 90C285 105 225 130 260 145M270 160C305 175 245 200 280 215')}`,
  electrical: `${box(85,60,150,190)}${box(110,95,40,30,'#fde3e3')}${box(170,95,40,30)}${box(110,145,40,30)}${box(170,145,40,30,'#fde3e3')}${path('M280 90L245 160H275L245 230')}`,
  painting: `${box(75,70,150,55,'#fde3e3',13)}${path('M225 97H250V150H160V190')}${box(145,190,30,65,'#e00707')}${path('M80 150V230M105 150V200M130 150V215')}`,
  landscaping: `${path('M55 225Q180 180 305 225M65 245H295')}${path('M115 220V135M115 175Q65 170 80 125Q120 120 115 175M115 160Q165 155 150 110Q110 105 115 160')}${circle(235,120,40,'#dceddf')}${path('M235 220V150M220 180L235 165L250 180')}`,
  drywall: `${box(80,65,200,185)}${line(180,65,180,250)}${path('M100 95H165M100 135H165M195 95H260M195 135H260')}${path('M125 225L190 180L215 215L140 240Z')}`,
  concrete: `${path('M60 210L155 145L300 180L210 250Z')}${path('M60 210V230L210 270L300 200V180M210 250V270')}${path('M175 85L235 105L200 155L150 135ZM185 95L205 55')}`,
  masonry: `${tiles(75,100,3,5)}${path('M100 75H260M155 60V90M225 60V90')}`,
  carpentry: `${path('M70 230L250 65L280 95L100 260ZM115 210L130 225M145 180L160 195M175 150L190 165M205 120L220 135')}${path('M80 80L120 50L220 155L190 185ZM190 185L215 210')}`,
  flooring: `${path('M55 235L160 100L305 145L215 265Z')}${path('M90 245L190 110M130 255L230 123M175 260L265 135M110 165L250 205')}`,
  tile: `${tiles()}${path('M265 55L290 80L235 135L210 110Z')}${path('M215 115L200 130')}`,
  windows: `${window}${path('M115 135L145 105M200 210L240 170')}`,
  doors: `${box(100,55,160,210)}${box(120,75,120,190,'#fde3e3')}${box(140,95,80,60)}${circle(215,185,5,'#e00707')}${path('M70 265H290')}`,
  fencing: `${[70,125,180,235].map(x=>path(`M${x} 245V100L${x+20} 75L${x+40} 100V245Z`)).join('')}${box(55,135,250,16,'#fde3e3')}${box(55,195,250,16,'#fde3e3')}`,
  decks: `${path('M60 195L165 130L295 170L195 235ZM60 195V240M195 235V275M295 170V220')}${path('M95 175V105L295 145V170M145 185V115M195 195V125M245 205V135M95 105L295 145')}`,
  siding: `${house}${path('M105 145H255M105 165H255M105 185H155M205 185H255M105 205H155M205 205H255M105 225H155M205 225H255')}`,
  gutters: `${path('M60 90L250 130L275 115M60 90V120L250 160L275 145V115M250 160V235L280 250')}${path('M125 60V80M165 70V90M205 80V100')}`,
  trees: `${circle(175,100,48,'#dceddf')}${circle(130,130,40,'#dceddf')}${circle(225,135,45,'#dceddf')}${path('M175 245V135M175 185L140 150M175 170L210 140M135 250H220')}`,
  'pressure-washing': `${path('M75 225L250 135L295 170L130 260Z')}${path('M90 65L150 95L130 130L70 100ZM130 130L200 165')}${path('M205 165L235 180M205 165L225 200M205 165L250 195')}`,
  'garage-doors': `${path('M55 110L180 50L305 110')}${box(80,110,200,145)}${path('M90 140H270M90 170H270M90 200H270M90 230H270')}${box(165,205,30,10,'#fde3e3')}`,
  handyman: `${box(75,145,210,100,'#fde3e3')}${path('M130 145V115H230V145M75 185H285')}${box(165,170,30,30)}${path('M110 140L95 70L125 65L140 140M215 140L240 65L260 75L235 140')}`,
  'pest-control': `${path('M180 55L265 85V155Q255 215 180 250Q105 215 95 155V85Z')}${circle(180,145,25,'#fde3e3')}${path('M180 120V100M160 125L140 105M200 125L220 105M155 145H130M205 145H230M160 165L140 185M200 165L220 185M110 220L250 80')}`,
  locksmith: `${circle(130,115,50,'#fde3e3')}${circle(130,115,18)}${path('M165 150L260 245L280 225L260 205L245 220L225 200L240 185L200 145')}`,
  appliances: `${box(80,60,180,205)}${line(80,105,260,105)}${circle(170,180,55,'#fde3e3')}${circle(170,180,38)}${circle(110,83,6,'#e00707')}${box(195,75,45,16)}`,
  insulation: `${path('M75 80L180 55L285 80V230L180 260L75 230Z')}${path('M115 75V240M245 75V240M150 65V250M210 65V250')}${path('M155 90Q205 110 155 130Q205 150 155 170Q205 190 155 210Q205 230 155 245')}`,
  solar: `${path('M65 185L115 90H280L230 185Z')}${path('M90 140H255M130 185L180 90M185 185L235 90M150 185V235H220')}${circle(80,60,22,'#fde3e3')}${path('M80 20V30M40 60H50M110 30L100 40')}`,
  pools: `${path('M65 140Q65 105 180 105Q295 105 295 140V215Q295 250 180 250Q65 250 65 215Z')}${path('M65 140Q180 200 295 140M90 195Q115 180 140 195T190 195T240 195M115 95V160M150 95V170M115 120H150M115 145H150')}`,
  septic: `${box(65,125,155,115,'#fde3e3')}${path('M55 100H300M100 125V100H170V125M220 160H285V235M250 160V220M285 185H310M285 210H310')}${line(70,195,215,195)}`,
  remodeling: `${house}${path('M115 145H245V170H115ZM115 200H150M210 200H245')}${path('M285 195L310 170M270 210L295 185M250 230L275 205')}`,
  foundations: `${path('M80 90H280V210H250V245H210V215H145V245H105V210H80Z')}${path('M180 100L165 140L190 165L175 205M55 265H305')}${line(85,185,275,185)}`,
  waterproofing: `${path('M95 80H205V235H95ZM205 235H280V260H95')}${path('M220 70Q175 125 220 125Q265 125 220 70Z')}${path('M115 105V220M140 105V220M165 105V220M235 180L260 205L300 150')}`,
  'general-contractors': `${house}${box(210,125,105,145,'#fde3e3')}${box(230,110,65,30)}${path('M230 175L240 185L260 160M230 210H295M230 240H285')}`,
  'home-cleaning': `${path('M125 90H195L215 245H105ZM145 90V65H195M195 65H225')}${box(115,155,90,55,'#fde3e3')}${path('M270 80V245M240 245L250 200H290L300 245Z')}${path('M65 125V155M50 140H80')}`,
  'junk-removal': `${box(80,110,150,135,'#fde3e3')}${box(65,95,180,20)}${path('M115 95V75H195V95M115 140V220M155 140V220M195 140V220')}${box(245,180,60,65)}${path('M245 180L275 160L305 180M275 180V245')}`,
  moving: `${box(55,115,170,120)}${path('M225 150H265L305 195V235H225Z')}${circle(105,240,22)}${circle(260,240,22)}${box(85,65,75,50,'#fde3e3')}${path('M122 65V115M245 170H260L280 195H245Z')}`,
  'home-inspection': `${house}${circle(220,165,50,'#fde3e3')}${path('M255 205L295 250M195 165L215 185L245 145')}`,
  'interior-design': `${box(65,60,230,200)}${path('M85 80H180V150H275M85 150H125V240M180 80V120M210 190H275V240H210Z')}${circle(155,205,25,'#fde3e3')}${path('M275 40L310 75L260 125L225 90Z')}`,
  'home-automation': `${house}${box(215,125,90,135,'#fde3e3',12)}${circle(260,230,7)}${path('M235 165Q260 140 285 165M245 180Q260 165 275 180')}${circle(260,195,4,'#e00707')}`,
  'home-networks': `${box(80,180,200,65,'#fde3e3')}${path('M110 180V140M250 180V140M105 90Q180 25 255 90M130 115Q180 70 230 115M155 140Q180 115 205 140')}${circle(180,160,5,'#e00707')}${path('M110 215H120M140 215H150M170 215H180')}`,
  irrigation: `${path('M70 240H290M180 240V175M145 175H215M160 175V160H200V175M180 145Q130 75 70 125M180 145Q230 75 290 125M180 145V80')}${path('M90 150V165M125 140V155M235 140V155M270 150V165')}`,
  excavation: `${box(65,165,125,60,'#fde3e3')}${path('M90 165V110H150L170 165M190 170L230 80L275 110L260 180L300 200L270 225L235 200V180')}${box(55,230,155,30)}${circle(85,245,10)}${circle(175,245,10)}`,
  demolition: `${tiles(90,115,3,4)}${path('M180 115L160 150L185 180L165 225M110 60L145 40L240 135L210 170ZM210 170L260 220')}`,
  'damage-restoration': `${house}${path('M120 230Q140 215 160 230T200 230T240 230')}${path('M180 130Q140 180 180 180Q220 180 180 130Z')}${path('M265 65L280 80L310 45')}`,
  chimneys: `${path('M90 245V105H230V245M75 105H245V80H75Z')}${path('M95 145H225M95 185H225M95 225H225M140 105V145M180 145V185M140 185V225')}${path('M130 60Q110 30 140 15M190 60Q170 30 200 15')}`,
  cabinetry: `${cabinet}${box(80,65,200,30,'#fde3e3')}${path('M95 120H165M195 120H265')}`,
  countertops: `${path('M60 115L245 75L305 115L120 155ZM60 115V140L120 180L305 140V115M120 180V255M280 145V230')}${path('M125 110L200 94L230 112L155 130Z')}`,
  'glass-mirrors': `${box(80,55,140,200,'#e9f2f5',18)}${box(100,75,100,160,'#fff',12)}${path('M115 130L160 85M125 170L185 110')}${box(235,110,65,140,'#fde3e3')}${path('M250 230L285 195')}`,
};
const directory = new URL('../public/category-art/', import.meta.url);
mkdirSync(directory, {recursive:true});
for (const [id, drawing] of Object.entries(drawings)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320"><rect width="480" height="320" rx="24" fill="#fff7f5"/><circle cx="350" cy="90" r="90" fill="#fde3e3"/><path d="M35 275H445" stroke="#f2c8c5" stroke-width="2"/><g transform="translate(55 0)" fill="none" stroke="#343638" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${drawing}</g><circle cx="425" cy="255" r="16" fill="#e00707"/><path d="M418 255h14m-7-7v14" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
  writeFileSync(new URL(`${id}.svg`, directory), svg);
}
console.log(`Generated ${Object.keys(drawings).length} original category illustrations.`);
