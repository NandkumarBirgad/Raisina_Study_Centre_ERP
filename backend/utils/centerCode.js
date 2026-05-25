import Center from "../models/Center.js";

const CENTER_CODE_MAP = {
  "Chhatrapati Sambhajinagar": "CSN",
  "Chhatrapati Sambhaji Nagar": "CSN",
  "Sambhajinagar": "CSN",
  "Sambhaji Nagar": "CSN",

  "Latur": "LTR",
  "Amravati": "AMT",

  "Hyderabad": "HYD",
  "Hydrabad": "HYD",
};

export const generateCenterCode = async (centerName = "CENTER") => {
  const mappedCode = CENTER_CODE_MAP[centerName];

  if (mappedCode) {
    return mappedCode;
  }

  const words = centerName.trim().split(/\s+/);

  let prefix = words
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  if (!prefix) {
    prefix = "CTR";
  }

  let code = prefix;
  let counter = 1;

  while (await Center.findOne({ centerCode: code, deleted: { $ne: true } })) {
    code = `${prefix}${counter}`;
    counter++;
  }

  return code;
};

export const ensureCenterCode = async (centerInput) => {
  if (!centerInput) {
    throw new Error("Center is required to generate center code");
  }

  let center;

  // Case 1: centerInput is already a Center document/object
  if (centerInput.centerName || centerInput.centerCode) {
    center = centerInput;
  }

  // Case 2: centerInput is centerId
  else {
    center = await Center.findOne({
      _id: centerInput,
      deleted: { $ne: true },
    });
  }

  if (!center) {
    throw new Error("Center not found while generating center code");
  }

  if (center.centerCode) {
    return center.centerCode.toUpperCase().trim();
  }

  const generatedCode = await generateCenterCode(center.centerName);

  // Save generated code for future use
  await Center.findByIdAndUpdate(center._id, {
    centerCode: generatedCode,
  });

  return generatedCode;
};