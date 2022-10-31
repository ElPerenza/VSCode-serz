/**
 * Represents an error thrown by the `Serz` class.
 */
class SerzError extends Error {

    public readonly errorCode: SerzError.Code

    /**
     * Instantiates a new `SerzError`.
     * @param errorCode the error code of this error
     * @param message the error message 
     */
    public constructor(errorCode: SerzError.Code, message?: string) {
        super(message)
        this.errorCode = errorCode
        Object.setPrototypeOf(this, SerzError.prototype); //https://www.typescriptlang.org/docs/handbook/2/classes.html#inheriting-built-in-types
    }
}

namespace SerzError {
    /**
     * Error codes for `SerzError`.
     */
    export enum Code {
        /**
         * Indicates that the path to serz.exe found in the configuration is invalid.
         */
        SerzPathInvalid,
        /**
         * Indicates that the conversion process failed.
         */
        ConversionFailed
    }
}

export default SerzError