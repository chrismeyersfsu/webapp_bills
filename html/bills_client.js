var itemDataKey = "rawData";


// TODO: Make more robust, alert, no alert, user choice, etc.
var Gretry = 0;
var GretryMax = 2;
function getAndFillRetry(params, callback) {
    if (Gretry >= GretryMax) {
        Gretry = 0;
        alert("Failed !");
        return;
    }
    Gretry++;
    alert("Getting data failed retrying " + Gretry + " of " + GretryMax);
    switch (params.length) {
        case 0:
        return callback();
        case 1:
        return callback(params[0]);
        case 2:
        return callback(params[0], params[1]);
        case 3:
        return callback(params[0], params[1], params[2]);
        case 4:
        return callback(params[0], params[1], params[2], params[3]);
        case 5:
        return callback(params[0], params[1], params[2], params[3], params[5]);
    }
}

function getAndFillRetryNoNotify(params, callback) {
    if (Gretry >= GretryMax) {
        Gretry = 0;
        return;
    }
    Gretry++;
    switch (params.length) {
        case 0:
        return callback();
        case 1:
        return callback(params[0]);
        case 2:
        return callback(params[0], params[1]);
        case 3:
        return callback(params[0], params[1], params[2]);
        case 4:
        return callback(params[0], params[1], params[2], params[3]);
        case 5:
        return callback(params[0], params[1], params[2], params[3], params[5]);
    }

}


function getBlackboardSchedule(username, password, callbackFunc) {
    var url = "../bb";
    var urlFull = url;
//    var urlFull = url + '?username=' + username + '&password=' + password;
    var urlData = 'username=' + username + '&password=' + password;
//    var urlFull = 'json/test.blackboard.schedule.json';
    // 10 second timeout
    
    $.ajax({url:urlFull, dataType:'json', data: urlData,timeout: 15000, success: function(data) {
        if (callbackFunc) {
            callbackFunc(data);
        }
    }, error: function() {
        getAndFillRetry([username, password, callbackFunc], getBlackboardSchedule);
        //$.mobile.pageLoading(true);
    }});

    /*
    $.getJSON(urlFull, function(data) {
        if (callbackFunc) {
            callbackFunc(data);
        }
    }).error(function() {
        getAndFillRetry([username, password, callbackFunc], getBlackboardSchedule);
    });
    */
}

function getBlackboardScheduleAndCrossReference(username, password, foreachFunc) {
    var campus = 92;
    var term = 107;
    var deptDataExact = '';
    var courseDataExact = '';
    var sectionDataExact = '';

    getBlackboardSchedule(username, password, function(scheduleData) {
        // each course the user is signed up for
        var scheduleSize = scheduleData.length;
        $.each(scheduleData, function(index, entry) {
            getAndFillDepartments(null, campus, term, null, function(deptData) {
                var course = entry.course;
                var abrev = course.substr(0, 3);
                var courseNum = course.substr(3, 4);
                var sectionNum = parseInt(entry.section);

                var i=0;
                var deptId = '';
                for (i=0; i < deptData.length; ++i) {
                    if (deptData[i].deptAbrev == abrev) {
                        break;
                    }
                }
                if (i == deptData.length) {
                    //alert("Department not found!");
                    foreachFunc(index, scheduleSize, deptDataExact, courseDataExact, sectionDataExact);
                    return true;
                }
                deptId = deptData[i].deptId;
                deptDataExact = deptData[i];

                // we have found the department, now get the course
                getAndFillCourses(null, deptId, term, null, function (courseData) {
                    var i=0;
                    var courseId = '';
                    for (i=0; i < courseData.length; ++i) {
                        if (courseData[i].courseNumber == courseNum) {
                            break;
                        }
                    }
                    if (i == courseData.length) {
                        //alert("Course not found ["+course+"]");
                        foreachFunc(index, scheduleSize, deptDataExact, courseDataExact, sectionDataExact);
                        return true;
                    }
                    courseId = courseData[i].courseId;
                    courseDataExact = courseData[i];

                    // we now have the course, find the section
                    getAndFillSections(null, courseId, term, null, function(sectionData) {
                        var i=0;
                        var sectionId = '';
                        for (i=0; i < sectionData.length; ++i) {
                            var sectionArray = [];
                            var sectionName = sectionData[i].sectionName;
                            var index_or = sectionName.indexOf("+");
                            var index_range = sectionName.indexOf("-");
                            var flagFound = false;
                            
                            if (index_or != -1) {
                                var indexArray = sectionName.split('+');
                                for (var j=0; j < indexArray.length; ++j) {
                                    if (sectionNum == indexArray[j]) {
                                        flagFound = true;
                                        break;
                                    }
                                }
                                if (flagFound == true) {
                                    break;
                                }
                            } else if (index_range != -1) {
                                var indexArray = sectionName.split('-');
                                if (sectionNum >= indexArray[0] && sectionNum <= indexArray[1]) {
                                    break;
                                }
                            } else if (sectionName == "ALL") {
                                break;
                            } else if (sectionName.match(/[0-9]/)) {
                                // one section listed, assume it's it
                                break;
                            } else {
                                alert("Parse error, no range or or on index on course ["+courseId+"] section ["+sectionNum+"] sectionName ["+sectionName+"]");
                                return true;
                            }
                        }
                        if (i == sectionData.length) {
                            //alert("Section not found ["+sectionNum+"] for course ["+course+"]");
                            foreachFunc(index, scheduleSize, deptDataExact, courseDataExact, sectionDataExact);
                            return true;
                        }
 
                        sectionId = sectionData[i].sectionId;
                        sectionDataExact = sectionData[i];

                        if (foreachFunc) {
                            foreachFunc(index, scheduleSize, deptDataExact, courseDataExact, sectionDataExact);
                        }
                    }); // getAndFillSections()
                }); // getAndFillCourses()
            }); // getAndFillDepartments()
        }); // for each class in schedule
    }); // getBlackboardSchedule()
}



/*******************************************************
* Ghetto sync cart
********************************************************/
function syncCart(klasses) {
    $.each(klasses, function(kIndex, klass) {
        $.each(klass.books, function(bIndex, book) {
            var items = book.kart.items;
            var i=0;
            var dataPair = {
                'dept_name': klass.deptData.deptAbrev,
                'section_name': klass.sectionData.sectionName,
                'type': 2,
            };
            for (var key in items) {
                i++;
                value = items[key];
//            $.each(items, function(key, value) {
                //if (value > 0) {
                    dataPair['qty-'+i] = value;
                    dataPair['pf_id-'+i] = book.pfId;
                    dataPair['pf_type_id-'+i] = 2;
                    dataPair['no-product-'+i] = 0;
                    dataPair['sku_'+i] = book[key];
                    dataPair['rental_flag-'+i] = 0;
                    console.log("key ["+key+"]");
                    if ((key == trans['skuUsedRent']) ||
                        (key == trans['skuNewRent'])) {
                        dataPair['rental_flag-'+i] = 1;
                    }
                //}   // if book type
            } // each book item (used, new, usedRent, NewRent)
            dataPair['rcdCount'] =  i,
                    $.ajax({
                        url: 'http://www.billsbookstore.com/xt_orderform_additem.asp?target=buy_courselisting.asp',
                        data: dataPair,
                        type: "GET",
                        success: function(data) {
                            console.log("Success ["+JSON.stringify(dataPair, ",")+"]");
                        },
                        error: function(obj) {
                            console.log("Error ["+JSON.stringify(dataPair, ",")+"]\n\n"+obj.statusText+"\n\n"+obj.responseText);
                        }
                    });
        }); // each book
    }); // each klass
}

/*******************************************************
* Core app engine <-> blackboard <-> billsbookstorefsu
* functions
********************************************************/

function getAndFillCampusTerm(instantiateFunc, anchor, callbackFunc) {
	var url = $Conf['baseUrl'] + "/campusterm"; 
    $.getJSON(url, function(data) {
        $.each(data, function(index, entry) {
            if (instantiateFunc) {
                instantiateFunc(entry, anchor);
            }
        });
        if (callbackFunc) {
            callbackFunc(data);
        }
    }).error(function() {
        getAndFillRetry([instantiateFunc, anchor, callbackFunc], getAndFillCampusTerm);
    });
}

function getAndFillDepartments(instantiateFunc, campusId, termId, anchor, callbackFunc) {
	var url = $Conf['baseUrl'] + "/dept";
    var urlFull = url + '?campus=' + campusId + '&term=' + termId;
//    var urlFull = 'json/dept.json';
//    var urlFull = 'test_departments.txt';
    $.getJSON(urlFull, function(data) {
        $.each(data, function(index, entry) {
            if (instantiateFunc) {
                instantiateFunc(entry, anchor);
            }
        });
        if (callbackFunc) {
            callbackFunc(data);
        }
    }).error(function() { 
        getAndFillRetry([instantiateFunc, campusId, termId, anchor, callbackFunc], getAndFillDepartments);
    });
}

function getAndFillCourses(instantiateFunc, deptId, termId, anchor, callbackFunc) {
	var url = $Conf['baseUrl'] + "/course";
    var urlFull = url + '?dept=' + deptId + '&term=' + termId;
//    var urlFull = 'json/course.json';
    $.getJSON(urlFull, function(data) {
        $.each(data, function(index, entry) {
            if (instantiateFunc) {
                instantiateFunc(entry, anchor);
            }
        });
        if (callbackFunc) {
            callbackFunc(data);
        }
    }).error(function() {
        getAndFillRetry([instantiateFunc, deptId, termId, anchor, callbackFunc], getAndFillCourses);
    });
}


function getAndFillSections(instantiateFunc, courseId, termId, anchor, callbackFunc) {
	var url = $Conf['baseUrl'] + "/section";
    var urlFull = url + '?course='+courseId+'&term='+termId;
//    var urlFull = 'json/section.json';
    $.getJSON(urlFull, function(data) {
//    $.getJSON('test_sections.json', function(data) {
        $.each(data, function(index, entry) {
            if (instantiateFunc) {
                instantiateFunc(entry, anchor);
            }
        });
        if (callbackFunc) {
            callbackFunc(data);
        }
    }).error(function() {
        getAndFillRetry([instantiateFunc, courseId, termId, anchor, callbackFunc], getAndFillSections);
    });
}

function getBooks(sectionId, callbackFunc) {
	var url = $Conf['baseUrl'] + "/books";
    var urlFull = url + '?id='+sectionId;
//    var urlFull = 'json/books.json';
    $.getJSON(urlFull, function (data) {
        if (callbackFunc) {
            callbackFunc(data);
        }
     }).error(function() {
        getAndFillRetryNoNotify([sectionId, callbackFunc], getBooks);
     });
}
