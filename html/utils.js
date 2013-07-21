function asyncManager(size, callback) {
    this.complete_count = 0;
    this.complete_count_success = 0;
    this.complete_count_fail = 0;
    this.complete_size = size;
    this.flag_did_callback = false;
    this.complete_flag = false;
    this.callback = callback;
    console.log("Total number of classes ["+size+"]");
}
asyncManager.prototype.isComplete = function() {
    if (this.complete_count == this.complete_size) {
        return true;
    }
    return false;
}
asyncManager.prototype.jobComplete = function() {
    this.complete_count++;
    console.log("[asyncManager] jobComplete(): Finished job ["+this.complete_count+"] of ["+this.complete_size+"]");
    if (this.complete_flag == false &&
        this.isComplete() == true) {
        console.log("[asyncManager] jobComplete(): Finished all ["+this.complete_size+"] jobs, calling back if defined");
        if (this.callback) {
            this.callback(this)
        }
        this.complete_flag = true
    }
}
asyncManager.prototype.jobFail = function() {

}
asyncManager.prototype.forceComplete = function() {
    if (this.callback) {
        this.callback(this)
    }
    this.complete_flag = true
}
