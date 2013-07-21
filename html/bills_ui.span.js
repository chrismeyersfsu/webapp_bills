
var baseUrl = 'http://billsbookstore.com/';

function instantiateCampusTerm(rawData, anchor) {
    var itemId = "campusterm-" + $(anchor + ' li').size();
    $(anchor).append('<li id="'+itemId+'"><a href="#">'+rawData.campusName+'</a></li>');

    $('#'+itemId).bind('click', {"itemId" : itemId, "campusTermData": rawData}, catchCampusTermClick);
}

function instantiateDepartment(rawData, anchor) {
    var itemId = "dept-" + $(anchor + ' li').size();
    $(anchor).append('<li id="'+itemId+'"><a href="#">'+rawData.deptAbrev+'-'+rawData.deptName+'</a></li>');

    $('#'+itemId).bind('click', {"itemId" : itemId, "deptData": rawData}, catchDepartmentClick);
}

function instantiateCourse(rawData, anchor) {
    var itemId = "course-" + $(anchor + ' li').size();
    $(anchor).append('<li id="'+itemId+'"><a href="#sectionPage">'+NavState.deptData.deptAbrev+'-'+rawData.courseNumber+'</a></li>');

    $('#'+itemId).bind('click', {"itemId" : itemId, "courseData": rawData}, catchCourseClick);
}

function instantiateSection(rawData, anchor) {
    var itemId = "section-" + $(anchor + ' li').size();
    $(anchor).append('<li id="'+itemId+'"><a href="#">'+rawData.sectionId+' - ['+rawData.instructor+']</a></li>');

    $('#'+itemId).bind('click', {"itemId" : itemId, "sectionData": rawData}, catchSectionClick);
}

function instantiateKlass(klass, anchor) {
    var itemId = "klass-" + $(anchor + ' li').size();
    var removeCourseId = "removeCourse-" + $(anchor + ' li').size();
    $(anchor).append('<li id="'+itemId+'" data-role="list-divider"> \
    <div class="ui-grid-a"> \
        <div class="ui-block-a" style="width: 50px"> \
            <img id="'+removeCourseId+'" src="images/close_32x32.png"> \
        </div> \
        <div class="ui-block-b"> \
            '+klass.deptData.deptAbrev+'-'+klass.courseData.courseNumber+' \
        </div> \
    </li>');
    courseBookHO.add("Remove course and corresponding books from list.", 'Course Removal', '#'+removeCourseId);

    $('#'+removeCourseId).bind('click', {"itemId" : itemId, "klass" : klass}, function(event) {
        var klass = event.data.klass;
        var klassFound = KMgr.findKlass(klass.courseId, klass.sectionId);

        /* For each book in the class,
         * remove the book from the book manager
         */
        $.each(klass.books, function(index, book) {
            var bookObj = book.itemId;
            $('#'+bookObj).remove();
        });

        $('#'+itemId).remove();
        KMgr.removeKlass(klassFound);
    
        $('#courseBookList').listview('refresh');
        // TODO: Remove books from BkMgr before removing klass
    });
}

/*
function instantiateKlassAndBooks(klass, anchor) {
    var itemId = "klass-" + $(anchor + ' li').size();
    $(anchor).append('<li id="'+itemId+'" data-role="list-divider">'+klass.getName()+'</li>');

    // TODO: Bind the click function
    $('#'+itemId).bind('click', {"itemId" : itemId, "klass" : klass}, null);
  
    $.each(klass.books, function(index, book) {
        instantiateBook(book, anchor);
    });
}
*/
function instantiateBook(book, anchor) {
    var size = $(anchor + ' li').size();
    var itemId = "book-" + size;
    book.itemId = itemId;
    var titleId = "title-" + size;
    var usedId = "used-" + size;
    var newId = "new-" + size;
    var newRentId = "newrent-" + size;
    var usedRentId = "usedrent-" + size;
    var bookImageId = "book-image-" + size;
    var requirementId = "requirement-" + size;
    var strDisabled = 'disabled=true class="ui-disabled"';
    var strRequired = 'class="ho-required"';
    var strOptional = 'class="ho-optional"';
    var str = '<li id="'+itemId+'" style="padding: 1px"> \
    <div width="100%" id="'+requirementId+'"';
    if (book.requirement == 'required') {
        str += ' ' + strRequired;
    } else {
        str += ' ' + strOptional;
    }
    str += ' id="'+titleId+'">'+book.title+', '+book.edition+'</div><br \> \
    <div class="ui-grid-b"> \
        <div class="ui-block-a" style="width: 75px"> \
            <img src="'+baseUrl+book.image+'" width="75px" id="'+bookImageId+'" data-rel="dialog" /></div> \
        <div class="ui-block-b" style="width: auto"> \
            <span id="'+usedRentId+'" data-role="button" data-icon="plus" data-inline="true" style="padding-top: 1px"';
            if (book.availUsedRent == "N/A") {
                str += ' ' + strDisabled;
            }
    str += '>Rent Used $'+book.priceUsedRent+'</span><br \> \
            <span id="'+newRentId+'" data-role="button" data-icon="plus" data-inline="true"';
            if (book.availNewRent == "N/A") {
                str += ' ' + strDisabled;
            }
    str += '>Rent New $'+book.priceNewRent+'</span></div> \
        <div class="ui-block-c" style="width: auto"> \
            <span id="'+usedId+'" data-role="button" data-icon="plus" data-inline="true"';
            if (book.availUsed == "N/A") {
                str += ' ' + strDisabled;
            }
    str += '>Used $'+book.priceUsed+'</span><br \> \
            <span id="'+newId+'" data-role="button" data-icon="plus" data-inline="true"';
            if (book.availNew == "N/A") {
                str += ' ' + strDisabled;
            }
    str += '>New $'+book.priceNew+'</span></div> \
    </div> \
    </li>';
    courseBookHO.add("GREEN: Book required for course\nRED: Book optional for course\n", 'Required / Optional', '#'+requirementId);
    courseBookHO.add("Add new rental book to cart. Greyed button indicates item NOT AVAILABLE.", 'New Rental', '#'+newRentId);
    courseBookHO.add("Add used rental book to cart. Greyed button indicates item NOT AVAILABLE", 'Used Rental', '#'+usedRentId);
    courseBookHO.add("Add new book to shopping cart. Greyed button indicates item NOT AVAILABLE", 'New', '#'+newId);
    courseBookHO.add("Add used book to shopping cart. Greyed button indicates item NOT AVAILABLE", 'Used', '#'+usedId);
    $(anchor).append(str).trigger('create');
    
    $('#'+bookImageId).bind('click', {"itemId" : itemId, "book": book}, catchBookDetailsClick);
    $('#'+newId).bind('click', {"itemId" : newId, "disableId": newRentId, "disableType": trans['skuNewRent'], "book": book, "type": trans['skuNew'] }, catchKartClick);
    $('#'+usedId).bind('click', {"itemId" : usedId, "disableId": usedRentId, "disableType": trans['skuUsedRent'], "book": book, "type": trans['skuUsed'] }, catchKartClick);
    $('#'+usedRentId).bind('click', {"itemId" : usedRentId, "disableId": usedId, "disableType": trans['skuUsed'], "book": book, "type": trans['skuUsedRent'] }, catchKartClick);
    $('#'+newRentId).bind('click', {"itemId" : newRentId, "disableId": newId, "disableType": trans['skuNew'], "book": book, "type": trans['skuNewRent'] }, catchKartClick);
//    $('#'+itemId).bind('click', {"itemId" : itemId}, catchBookClick);
    courseBookHO.add("Click for book details like author, isbn, edition, etc.", 'Book', '#'+bookImageId);
    
}

function catchKartClick(event) {
    var itemId = event.data.itemId;
    var book = event.data.book;
    var data = "";
    var disableId = event.data.disableId;
    var disableType = event.data.disableType;
    var type = event.data.type;
    data['book'] = book;
    data[trans['itemId']] = itemId;
    var iconE = $('#'+itemId+" span.ui-icon")
    var disableIconE = $('#'+disableId+" span.ui-icon")
    var itemE = $('#'+itemId);

    if (iconE.hasClass('ui-icon-plus') == true) {
        book.addItem(type);
    } else if (iconE.hasClass('ui-icon-minus') == true) {
        book.removeItem(type);
    }
    if (disableIconE.hasClass('ui-icon-minus') == true) {
        book.removeItem(disableType);
    }

    iconE.toggleClass('ui-icon-minus');
    iconE.toggleClass('ui-icon-plus');
    disableIconE.toggleClass('ui-icon-minus', false);
    disableIconE.toggleClass('ui-icon-plus', true);
}


function instantiateBookDetails(book, anchor) {
    $(anchor).empty();
    $(anchor).append('<li><center><img src="'+baseUrl+book.image+'"> \
    <br /> \
    Title: '+book.title+'<br \> \
    Requirement: '+book.requirement+'<br \> \
    Author: '+book.author+'<br \> \
    Edition: '+book.edition+'<br \> \
    Publisher: '+book.publisher+'<br \> \
    Binding: '+book.binding+'<br \> \
    ISBN: '+book.isbn+'<br \> \
    </center></li>');
    return;
}

function instantiateBookPurchase(book, anchor) {
    $(anchor).empty();
    $(anchor).append('<li> \
    <table border="0" style="width: 100%;"> \
      <tbody> \
        <tr> \
          <td>Rent New<br /></td> \
          <td>$'+book.priceNewRent+'<br /></td> \
          <td></td> \
        </tr> \
        <tr> \
          <td>Rent Used<br /> \
          </td> \
          <td>$'+book.priceUsedRent+'<br /> \
          </td> \
        </tr> \
        <tr> \
          <td>New<br /> \
          </td> \
          <td>$'+book.priceNew+'<br /> \
          </td> \
        </tr> \
        <tr> \
          <td>Used<br /> \
          </td> \
          <td>$'+book.priceUsed+'<br /> \
          </td> \
        </tr> \
      </tbody> \
    </table>');

}
