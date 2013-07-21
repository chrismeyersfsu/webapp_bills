function Enum() {}

var trans = {
    'itemId':           'itemId',       // Uniquely identifies a cart item
    'sectionId':        'sectionId',
    'courseId':         'courseId',
    'rawData':          'rawData',
    'priceUsedRent':    'priceUsedRent',
    'priceNewRent':     'priceNewRent',
    'priceNew':         'priceNew',
    'priceUsed':        'priceUsed',
    'skuUsedRent':      'skuUsedRent',
    'skuNewRent':       'skuNewRent',
    'skuNew':           'skuNew',
    'skuUsed':          'skuUsed',
};

/********************************************/
/* Klass Manager                            */
/********************************************/
function KlassManager() {
    this.klasses = [];
    return this;
}

KlassManager.prototype.add = function(sectionId, courseId) {
    klass = new Klass();
    klass.sectionId = sectionId;
    klass.courseId = courseId;
    this.klasses.push(klass);
}

KlassManager.prototype.addKlass = function(klass) {
    this.klasses.push(klass);
}

KlassManager.prototype.exists = function(klassB) {
    var flag_ret = false;
    for (var i=0; i < this.klasses.length; ++i) {
        var klassA = this.klasses[i];
        if (klassA.courseData.courseId == klassB.courseData.courseId &&
            klassA.sectionData[trans['sectionId']] == klassB.sectionData[trans['sectionId']]) {
            flag_ret = true;
        }
    }
    return flag_ret;
}

KlassManager.prototype.findKlass = function(courseId, sectionId) {
    for (var i=0; i < this.klasses.length; ++i) {
        var klass = this.klasses[i];
        if (klass[trans['sectionId']] == sectionId &&
            klass[trans['courseId']] == courseId) {
            return klass;
        }
    }
    return null;
}

KlassManager.prototype.removeKlass = function(klass) {
     for (var i=0; i < this.klasses.length; ++i) {
        var klassCurr = this.klasses[i];
        if (klassCurr == klass) {
            this.klasses.splice(i, 1);
            return true;
        }
    }
    return false;
}

/********************************************/
/* Klass                                    */
/********************************************/

function Klass() {
    this.deptData = "";
    this.courseData = "";
    this.sectionData = "";

    this[trans['sectionId']] = "";
    this[trans['courseId']] = "";
    this.books = [];
    return this;
}

Klass.prototype.addBook = function(book) {
    this.books.push(book);
}

Klass.prototype.parseBooks = function (data) {
    var klass = this;
    var books = [];
    $.each(data, function(index, entry) {
        var book = new Book(this);
        $.each(entry, function(k, v) {
            // Add decimals to the price
            // TODO: Detect "invalid" price N/A
            if (k.match(/^price/)) {
                var priceDec = v.substr(v.length-2, 2);
                var priceBase = v.substr(0, v.length-2);
                var priceFixed = priceBase + "." + priceDec;
                book[k] = priceFixed;
            } else {
                book[k] = v;
            }
        });
        books.push(book);
    });
    return books;
}

Klass.prototype.getBooksRemote = function (callbackFunc) {
    var klass = this;
    var sectionId = this[trans['sectionId']];
    getBooks(sectionId, function(data) {
        var books = klass.parseBooks(data);
        if (callbackFunc) {
            callbackFunc(books);
        }
    });
}

/********************************************/
/********************************************/

/********************************************/
/* Book                                     */
/********************************************/
function Book(klass) {
    this.klass = klass;
    this.kart = [];
    this.kart['items'] = { 'skuUsed': 0, 'skuNew': 0, 'skuUsedRent': 0, 'skuNewRent': 0 };
    return this;
}

Book.prototype.addItem = function(type) {
//    alert("Added item ["+type+"] to cart");
    this.kart.items[type] += 1;  
}

Book.prototype.removeItem = function(type) {
    if (this.kart.items[type] != 0) {
        this.kart.items[type] -= 1;
    }
}

/********************************************/
/********************************************/

Enum.NavState = { department:0, course:1, section:2, courseBook:3, dialogBookDetails:4, dialogBookPurchase: 5, campusTerm: 6, cart: 7 }

function NavigationState() {
    this.prevCampusTermData = ""
    this.prevDeptData = ""
    this.prevCourseData = ""
    this.prevSectionData = ""

    this.campusTermData = "";
    this.deptData = "";
    this.courseData = "";
    this.sectionData = "";

    this.state = Enum.NavState.department;
    return this;
}

NavigationState.prototype.setCampusTermData = function(data) {
    this.prevCampusTermData = this.campusTermData;
    this.campusTermData = data;
}

NavigationState.prototype.setDepartmentData = function(data) {
    this.prevDeptData = this.deptData;
    this.deptData = data;
}

NavigationState.prototype.setCourseData = function(data) {
    this.prevCourseData = this.courseData;
    this.courseData = data;
}

NavigationState.prototype.setSectionData = function(data) {
    this.prevSectionData = this.sectionData;
    this.sectionData = data;
}

NavigationState.prototype.shouldReload = function() {
    switch (this.state) {
        case Enum.NavState.department:
            return true;
        case Enum.NavState.course:
            if (this.deptData && this.prevDeptData &&
                this.deptData == this.prevDeptData) {
                return false;
            }
            return true;
        case Enum.NavState.section:
            if (this.courseData && this.prevCourseData &&
                this.courseData == this.prevCourseData) {
                return false;
            }
            return true;
        case Enum.NavState.courseBook:
            if (this.sectionData && this.prevSectionData &&
                this.sectionData.sectionId == this.prevSectionData.sectionId) {
                return false;
            }
            return true;
        default:
            return true;
    }
}

NavigationState.prototype.alertState = function() {
    var str = "";

    str += "Department: ["+this.prevDeptData.deptId+"] -> ["+this.deptData.deptId+"]\n";
    str += "Course: " + this.courseData.courseId + "\n";
    str += "Section: ["+this.prevSectionData.sectionId+"] -> ["+this.sectionData.sectionId+"]\n";
    alert(str);
}


var NavState;
var courseBookHO;

$(document).ready(function() {
    NavState = new NavigationState();
    KMgr = new KlassManager();
    courseBookHO = new HelpOverlay('course_book_help_overlay', '#courseBookContent');
});

$('#startPage').live('pagecreate', function(eventload) {

    $('#bb-sync').bind('click', function(event) {
        doGetBlackboardScheduleAndFillKlasses($('#bb-username').val(), $('#bb-password').val(), function() {
            $.mobile.changePage('#courseBookPage');
        }); 
    });

    $('#bb-grab').bind('click', function(event) {
        getBlackboardSchedule($('#bb-username').val(), $('#bb-password').val(), function(scheduleData) {
            console.log(JSON.stringify(scheduleData));
            alert(JSON.stringify(scheduleData));
        });
    });
});

$('#campusTermPage').live('pagecreate',function(event){
    NavState.state = Enum.NavState.campusTerm;
    $('#campusTermList').empty();
    getAndFillCampusTerm(instantiateCampusTerm, '#campusTermList', function(data) {
        $('#campusTermList').listview('refresh');
    });
});

$('#departmentPage').live('pagebeforeshow',function(event){
    NavState.state = Enum.NavState.department;
    var campusId = NavState.campusTermData.campusId;
    var termId = NavState.campusTermData.termId;
    
    $.mobile.pageLoading();
    $('#departmentList').empty();
    getAndFillDepartments(instantiateDepartment, campusId, termId, '#departmentList', function(data) {
        $('#departmentList').listview('refresh');
        $.mobile.pageLoading(true);
    });
});

$('#coursePage').live('pagebeforeshow',function(event){
    NavState.state = Enum.NavState.course;
    var deptId = NavState.deptData.deptId;
    var termId = NavState.campusTermData.termId;
    $('#courseList').empty();
    getAndFillCourses(instantiateCourse, deptId, termId, '#courseList', function (data) {
        $('#courseList').listview('refresh');
        $.mobile.pageLoading(true);
    });
});

$('#sectionPage').live('pagebeforeshow',function(event){
    NavState.state = Enum.NavState.section;
    var courseId = NavState.courseData.courseId;
    var termId = NavState.campusTermData.termId;
    $('#sectionList').empty();
    getAndFillSections(instantiateSection, courseId, termId, '#sectionList', function(data) {
        $('#sectionList').listview('refresh');
        $.mobile.pageLoading(true);
    });
});

function generateCourseBookPage() {
    $.each(KMgr.klasses, function(index1, klass) {
        instantiateKlass(klass, '#courseBookList');
        $.each(klass.books, function(index2, book) {
            instantiateBook(book, '#courseBookList');
        });

        $('#courseBookList').listview('refresh');
        $.mobile.pageLoading(true);
    });

    $('#ho-helpImage').bind('click', function(event) {
        courseBookHO.show();
    });
}

function generateCartPage() {
     $.each(KMgr.klasses, function(index1, klass) {
        $.each(klass.books, function(index2, book) {
            instantiateBook(book, '#cartList');
        });

        $('#cartList').listview('refresh');
        $.mobile.pageLoading(true);
    });
}

function doGetBlackboardScheduleAndFillKlasses(username, password, callbackFunc) {
    var flag_finished = false;
    $.mobile.pageLoading();
    var countKlasses=0;
    var sizeKlasses;
    getBlackboardScheduleAndCrossReference(username, password, function(indexKlass, sizeKlass, deptData, courseData, sectionData) {
        if (deptData && 
            courseData && 
            sectionData) {
            var klass = new Klass(); 
            klass.deptData = deptData;
            klass.sectionData = sectionData;
            klass.courseData = courseData;
            klass[trans['sectionId']] = sectionData.sectionId;
            klass[trans['courseId']] = courseData.courseId;
            klass.getBooksRemote(function(books) {
                $.each(books, function(index, book) {
                    klass.addBook(book);
                });
                if (!KMgr.exists(klass)) {
                    KMgr.addKlass(klass);
                }

                console.log("Finished getting books for klass ["+klass[trans['courseId']]+"]");
                countKlasses++;
                if (countKlasses == sizeKlass) {
                    console.log("Finished grabbing all books for all classes blackboard");
                    if (callbackFunc) {
                        callbackFunc();
                    }
                }
           });
        } else {
            countKlasses++;
            if (countKlasses == sizeKlass) {
                console.log("Finished grabbing all books for all classes blackboard");
                if (callbackFunc) {
                    callbackFunc();
                }
            }
        }
    });
}

function doSyncCart() {
    syncCart(KMgr.klasses);
}

$('#courseBookPage').live('pagebeforeshow',function(event){
    // FIXME: sectionId will prob be the database id
    // replace it with a more appropriate field name
    NavState.state = Enum.NavState.courseBook;

    $('#courseBookList').empty();
    generateCourseBookPage();
});

$('#cartPage').live('pagebeforeshow',function(event){ 
    NavState.state = Enum.NavState.cart;

    $('#cartList').empty();
    generateCartPage(); 
});


/**
 * Display dialog upon a book image click that shows details
 * such as author, isbn, edition, etc.
 */
$('#dialogBookDetailsPage').live('pagebeforeshow', function(event) {
    var book = NavState.book;
    $.mobile.pageLoading();
    instantiateBookDetails(book ,'#dialogBookDetailsContent');
    $.mobile.pageLoading(true);
});


/**
 * Dispaly new, used, newRent, usedRent dialog with - + that
 * controls the item count to be added to the cart
 */
$('#dialogBookPurchasePage').live('pageshow', function(event) {
    var book = NavState.book;
    instantiateBookPurchase(book ,'#dialogBookPurchaseContent');
});

function catchCampusTermClick(event) {
    var itemId = event.data.itemId;
    var campusTermData = event.data.campusTermData;
    NavState.setCampusTermData(campusTermData);
    $.mobile.changePage('#departmentPage');
    $.mobile.pageLoading();
}

function catchDepartmentClick(event) {
    var itemId = event.data.itemId;
    var deptData = event.data.deptData;
    NavState.setDepartmentData(deptData);
    $.mobile.changePage('#coursePage');
    $.mobile.pageLoading();
}

function catchCourseClick(event) {
    var itemId = event.data.itemId;
    var courseData = event.data.courseData;
    NavState.setCourseData(courseData);
    $.mobile.changePage('#sectionPage');
    $.mobile.pageLoading();
}

/**
 * Download corresponding books
 */
function catchSectionClick(event) {
    var itemId = event.data.itemId;
    var sectionData = event.data.sectionData;
    var section = sectionData.sectionId;
    NavState.setSectionData(sectionData);

    var klass = new Klass();
    klass.sectionData = NavState.sectionData;
    klass.courseData = NavState.courseData;
    klass.deptData = NavState.deptData;
    klass.sectionId = NavState.sectionData.sectionId;
    klass.courseId = NavState.courseData.courseId;

    if (KMgr.exists(klass)) {
        // TODO: Make more verbose error msg with class name, or an option to "force" add
        alert("Course already added");
        //$.mobile.changePage('#courseBookPage');
        return;
    }
    $.mobile.pageLoading();

    klass.getBooksRemote(function(books) {
        $.each(books, function(index, book) {
            klass.addBook(book);
        });
        KMgr.addKlass(klass);
        $.mobile.changePage('#courseBookPage');
    });
}

/*
 * UI click functions
 */

function catchBookDetailsClick(event) {
    var itemId = event.data.itemId;
    var book = event.data.book;
    NavState.state = Enum.NavState.dialogBookDetails;
    NavState.book = book;
    $.mobile.changePage('#dialogBookDetailsPage', { role: "dialog" });
}

function catchBookClick(event) {
    var itemId = event.data.itemId;
    var book = event.data.book;
    NavState.state = Enum.NavState.dialogBookPurchase;
    NavState.book = book;
    $.mobile.changePage('#dialogBookPurchasePage', { role: "dialog" });
    $.mobile.pageLoading();
}
