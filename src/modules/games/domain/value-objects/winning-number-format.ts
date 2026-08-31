import { ValidationError } from '../../../../shared/domain/errors/domain.error';
import { GameType } from './game-type';

export const MONTH_ABBREVIATIONS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;

export class WinningNumberFormat {
  static validateAndNormalize(gameType: GameType, raw: string): string {
    const value = raw.trim().toLowerCase();
    switch (gameType) {
      case GameType.REGULAR:
        return WinningNumberFormat.normalizeDigits(value, 2, 0, 99);
      case GameType.THREE_DIGIT:
        return WinningNumberFormat.normalizeDigits(value, 3, 0, 999);
      case GameType.FOUR_DIGIT:
        return WinningNumberFormat.normalizeDigits(value, 4, 0, 9999);
      case GameType.DATE:
        return WinningNumberFormat.normalizeDate(value);
      case GameType.MULTI_SORTEO:
        throw new ValidationError(
          'Multi Sorteo does not accept its own draw result; ' +
            'record results on its sub-games instead',
        );
    }
  }

  private static normalizeDigits(
    value: string,
    length: number,
    min: number,
    max: number,
  ): string {
    if (!/^\d+$/.test(value)) {
      throw new ValidationError(`Winning number must be numeric`);
    }
    const asNumber = Number(value);
    if (asNumber < min || asNumber > max) {
      throw new ValidationError(
        `Winning number must be between ${min} and ${max}`,
      );
    }
    return asNumber.toString().padStart(length, '0');
  }

  private static normalizeDate(value: string): string {
    // Accept both `DD-MMM` (13-feb) and `DD/MM` / `DD-MM` numeric (13/2).
    // Normalize to the canonical `DD-MMM` that ticket labels use — otherwise
    // the evaluator's exact string match against `line.label` never fires.
    const abbrevMatch = value.match(/^(\d{1,2})[-/](\w{3})$/);
    const numericMatch = value.match(/^(\d{1,2})[-/](\d{1,2})$/);

    let day: number;
    let monthAbbr: string;

    if (abbrevMatch) {
      day = Number(abbrevMatch[1]);
      monthAbbr = abbrevMatch[2].toLowerCase();
    } else if (numericMatch) {
      day = Number(numericMatch[1]);
      const monthNumber = Number(numericMatch[2]);
      if (monthNumber < 1 || monthNumber > 12) {
        throw new ValidationError('Winning month must be 1-12');
      }
      monthAbbr = MONTH_ABBREVIATIONS[monthNumber - 1];
    } else {
      throw new ValidationError(
        'Winning date must be DD-MMM (ej. 13-feb) o DD/MM (ej. 13/02)',
      );
    }

    if (day < 1 || day > 31) {
      throw new ValidationError('Winning day must be 1-31');
    }
    if (!MONTH_ABBREVIATIONS.includes(monthAbbr as (typeof MONTH_ABBREVIATIONS)[number])) {
      throw new ValidationError(
        `Winning month must be one of ${MONTH_ABBREVIATIONS.join(', ')}`,
      );
    }
    return `${day.toString().padStart(2, '0')}-${monthAbbr}`;
  }
}
