import Student from "../models/Student.js";
import Center from "../models/Center.js";

const CENTER_CODE_MAP = {
  "Chhatrapati Sambhajinagar": "CSN",
  "Chhatrapati Sambhaji Nagar": "CSN",
  Sambhajinagar: "CSN",
  "Sambhaji Nagar": "CSN",

  Latur: "LTR",
  Amravati: "AMT",

  Hyderabad: "HYD",
  Hydrabad: "HYD",
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getCenterCode = (center) => {
  const centerName = center.centerName || center.name || "";
  const savedCode = center.centerCode || center.code;

  if (savedCode) {
    return savedCode.toUpperCase().trim();
  }

  return CENTER_CODE_MAP[centerName]?.toUpperCase();
};

export const generateRSC = async (centerId) => {
  if (!centerId) {
    throw new Error("Center ID is required to generate RSC number");
  }

  const center = await Center.findOne({
    _id: centerId,
    deleted: false,
  }).select("centerName name code centerCode");

  if (!center) {
    throw new Error("Center not found while generating RSC number");
  }

  const centerCode = getCenterCode(center);

  if (!centerCode) {
    throw new Error(
      `Center code not found for center: ${center.centerName || center.name}`
    );
  }

  const prefix = `RSC-${centerCode}-`;

  const latestStudent = await Student.findOne({
    rscNumber: new RegExp(`^${escapeRegex(prefix)}`),
    deleted: { $ne: true },
  })
    .sort({ rscNumber: -1 })
    .select("rscNumber");

  let nextNumber = 1;

  if (latestStudent?.rscNumber) {
    const lastNumberPart = latestStudent.rscNumber.replace(prefix, "");
    const lastNumber = Number(lastNumberPart);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

// Optional alias, useful if some older file imports generateRSCNumber
export const generateRSCNumber = generateRSC;