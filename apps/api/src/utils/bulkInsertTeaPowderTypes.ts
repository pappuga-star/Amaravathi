import { connectDatabase } from '../config/db.js';
import { TeaPowderType } from '../models/index.js';
import { normalizeName } from '@amaravathi/shared-utils';

const providedNames = [
  'Borsaikota BOP',
  'Lamsa Tea',
  'Dikshi Gold BOPL',
  'Medanaad BOPL',
  'Ranglal Gold BOP',
  'Radhajuli Gold BOP',
  'Lalbag Royal BP',
  'Chokalette Tea',
  'Calkilla BOP',
  'Narayanpur BOP',
  'Selvonhampati BOPL',
  'Tengrai UK BOP',
  'ABT Gold BOPL',
  'Radhajuli Gold',
  'FB Tea Premium BOP',
  'Papumpare BOP',
  'Bortemto BOP',
  'Deha Tea BOP',
  'Bhavanipur BOP',
  'Assimika HG BOP',
  'Charoideo Pre PD',
  'Halmari BPS',
  'Kamarbund BP1',
  'Kamarbund PD1',
  'FB Tea BP',
  'Nandbari BP1',
  'Ghoramara PD',
  'Nilgiri Lamsa',
  'Modi Tea BOP',
  'Kharjan BPS',
  'Ghiramara BOP',
  'Lamsa Tea',
  'Lamsa Tea',
  'Selva Ganapathy Premium BOP',
  'Selva Ganapathy SBOP',
  'Chawalkhowa BOP',
  'Hookhmal BOP',
  'Santi BOP',
  'Papumpore BOP',
  'Dhingia BOP',
  'Cossipore BOP',
  'Selva Ganapathy BOP',
  'Damayanti BOP',
  'Khatubari BOP',
  'Lamsa Nilgiri',
  'Selva Ganapathy Pre SBOP',
  'Pinnacle BOPL',
  'Lamsa Tea',
  'Assmika HG BOP',
  'Charoideo Pre PD',
  'Lamsa Tea',
  'Sree Tea Estate BOP',
  'Pomi Tea BOP',
  'Selva Ganapathi Premium BOP',
  'Modi Tea CL BOP',
  'Aura BOP',
  'Melengi Pre BOP',
  'Phulampur BOP',
  'Napuk HG BOP',
  'Madhupur BOP',
  'Mani BOP',
  'Melengi Pre BOP',
  'Soula Tea BOP',
  'Pomi Tea BOP',
  'Kanhabari BOP',
  'Siyoli BOP',
  'Selva Ganapathi BOP',
  'Lamsa Tea',
  'Tamulbari PD',
  'Rathyuli Gold BOP',
  'Ghojanoma BOP',
  'Ranglal BOP',
  'Lamsa Tea',
  'Selva Ganapathi BOPL',
  'Charaideo BOP',
  'Selva Ganapathy Pre SBOP',
  'Sivarams BOPL',
  'Tizit Tea BOP',
  'Tizit Tea BOP',
  'Hunjan BOP',
  'Tamhill Pre BOPL',
  'Laxmipore BOPL',
  'Selva Ganapathy Pre BOP',
  'Pengen BOP',
];

type Summary = {
  totalProvided: number;
  alreadyExists: number;
  inserted: number;
  failed: Array<{ name: string; reason: string }>;
  skippedInInput: number;
};

function canonicalName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

async function run(): Promise<void> {
  await connectDatabase();

  const summary: Summary = {
    totalProvided: providedNames.length,
    alreadyExists: 0,
    inserted: 0,
    failed: [],
    skippedInInput: 0,
  };

  const uniqueInput = new Map<string, string>();
  for (const rawName of providedNames) {
    const normalized = normalizeName(rawName);
    if (!normalized) {
      summary.failed.push({ name: rawName, reason: 'Blank name' });
      continue;
    }
    if (uniqueInput.has(normalized)) {
      summary.skippedInInput += 1;
      continue;
    }
    uniqueInput.set(normalized, canonicalName(rawName));
  }

  const normalizedKeys = [...uniqueInput.keys()];
  const existing = await TeaPowderType.find(
    { nameKey: { $in: normalizedKeys } },
    { nameKey: 1 },
  ).lean();
  const existingKeys = new Set(existing.map((item: any) => String(item.nameKey)));

  const docsToInsert: Array<{ name: string; nameKey: string; active: boolean }> = [];
  for (const [nameKey, name] of uniqueInput.entries()) {
    if (existingKeys.has(nameKey)) {
      summary.alreadyExists += 1;
      continue;
    }
    docsToInsert.push({ name, nameKey, active: true });
  }

  if (docsToInsert.length > 0) {
    const result = await TeaPowderType.insertMany(docsToInsert, {
      ordered: false,
    });
    summary.inserted = result.length;
  }

  console.log(
    JSON.stringify(
      {
        totalProvided: summary.totalProvided,
        alreadyExists: summary.alreadyExists,
        inserted: summary.inserted,
        failed: summary.failed,
      },
      null,
      2,
    ),
  );
}

await run();
