import { CODE_POINT as $ } from '../utils/unicode';
import {
    isReservedCodePoint,
    isSurrogatePair,
    getSurrogatePairCodePoint
} from '../utils/unicode';


//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
export default class Preprocessor {
    constructor (html) {
        this.gapStack        = [];
        this.lastGapPos      = -1;
        this.lastCharPos     = -1;
        this.skipNextNewLine = false;

        this.write(html);

        //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
        this.pos = this.html.charCodeAt(0) === $.BOM ? 0 : -1;
    }

    _processHighRangeCodePoint (cp) {
        //NOTE: try to peek a surrogate pair
        if (this.pos !== this.lastCharPos) {
            var nextCp = this.html.charCodeAt(this.pos + 1);

            if (isSurrogatePair(cp, nextCp)) {
                //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                this.pos++;
                cp = getSurrogatePairCodePoint(cp, nextCp);

                //NOTE: add gap that should be avoided during retreat
                this._addGap();
            }
        }

        if (isReservedCodePoint(cp))
            cp = $.replacementCharacter;

        return cp;
    }

    _addGap () {
        this.gapStack.push(this.lastGapPos);
        this.lastGapPos = this.pos;
    }

    write (html) {
        if (this.html) {
            this.html = this.html.substring(0, this.pos + 1) +
                        html +
                        this.html.substring(this.pos + 1, this.html.length);

        }
        else
            this.html = html;


        this.lastCharPos = this.html.length - 1;
    }

    advanceAndPeekCodePoint () {
        this.pos++;

        if (this.pos > this.lastCharPos)
            return $.EOF;

        var cp = this.html.charCodeAt(this.pos);

        //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
        //must be ignored.
        if (this.skipNextNewLine && cp === $.LF) {
            this.skipNextNewLine = false;
            this._addGap();
            return this.advanceAndPeekCodePoint();
        }

        //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
        if (cp === $.CR) {
            this.skipNextNewLine = true;
            return $.LF;
        }

        this.skipNextNewLine = false;

        //OPTIMIZATION: first perform check if the code point in the allowed range that covers most common
        //HTML input (e.g. ASCII codes) to avoid performance-cost operations for high-range code points.
        return cp >= 0xD800 ? this._processHighRangeCodePoint(cp) : cp;
    }

    retreat () {
        if (this.pos === this.lastGapPos) {
            this.lastGapPos = this.gapStack.pop();
            this.pos--;
        }

        this.pos--;
    }
}