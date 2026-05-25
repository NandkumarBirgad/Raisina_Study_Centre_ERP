// PRN (Permanent Registration Number) Generator

import Student from "../models/Student.js";
import { ensureCenterCode } from "./centerCode.js";

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const generatePRN = async (centerId) => {
  if (!centerId) {
    throw new Error("Center ID is required to generate PRN");
  }

  const currentYear = new Date().getFullYear();
  const centerCode = await ensureCenterCode(centerId);

  const prnPrefix = `PRN-${currentYear}-${centerCode}-`;

  const latestStudent = await Student.findOne({
    prn: new RegExp(`^${escapeRegex(prnPrefix)}`),
    deleted: { $ne: true },
  })
    .sort({ prn: -1 })
    .select("prn");

  let nextNumber = 1;

  if (latestStudent?.prn) {
    const lastNumberPart = latestStudent.prn.replace(prnPrefix, "");
    const lastNumber = Number(lastNumberPart);

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prnPrefix}${String(nextNumber).padStart(4, "0")}`;
};