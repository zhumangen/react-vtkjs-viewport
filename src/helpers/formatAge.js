import formatDA from './formatDA';
import {
  parse,
  differenceInCalendarYears,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarDays,
} from 'date-fns';

function dateDiff(birthDate, studyDate) {
  if (!birthDate || !studyDate) return '';

  try {
    const parsedBirthDate = parse(birthDate, 'yyyyMMdd', new Date());
    const paredStudyDate = parse(studyDate, 'yyyyMMdd', new Date());
    let diff = differenceInCalendarYears(paredStudyDate, parsedBirthDate);
    let unit = 'Y';
    if (diff <= 1) {
      diff = differenceInCalendarMonths(paredStudyDate, parsedBirthDate);
      unit = 'M';
      if (diff <= 1) {
        diff = differenceInCalendarWeeks(paredStudyDate, parsedBirthDate);
        unit = 'W';
        if (diff <= 1) {
          diff = differenceInCalendarDays(paredStudyDate, parsedBirthDate);
          unit = 'D';
        }
      }
    }
    return `${diff}${unit}`;
  } catch (err) {
    console.warn('formatAge parse error: ', err);
    return '';
  }
}

export default function formatAge(birthDate, age, studyDate) {
  const birthStr = formatDA(birthDate);
  let ageStr = age;
  if (!ageStr) {
    ageStr = dateDiff(birthDate, studyDate);
  }

  if (birthStr && birthStr.length > 0) {
    return `${birthStr}(${ageStr})`;
  } else {
    return ageStr;
  }
}
