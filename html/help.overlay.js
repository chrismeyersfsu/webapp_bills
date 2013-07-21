function calcCenterRel(img) {
    var left = 0;
    var top = 0;
    var width = $(img).width();
    var height = $(img).height();

    left = (width/2);
    top = (height/2);
    return { 'left': left, 'top': top };
}


function calcCenterObjAbs(img, obj) {
    var left = 0;
    var top = 0;
    var imgOffCenter = calcCenterRel(img);
    var objOffCenter = calcCenterRel(obj);
    var imgOffset = $(img).offset();

    left = imgOffCenter.left - objOffCenter.left;
    top = imgOffCenter.top - objOffCenter.top;

    if (imgOffset) {
        left += imgOffset.left;
        top += imgOffset.top;
    }
    return { 'left': parseInt(left) , 'top': parseInt(top) };
}

var HelperCount = 0;

function HelperGenerateName() {
    var BASE_NAME = 'helper';
    var name = BASE_NAME+'-'+HelperCount;
    HelperCount++;
    return name;
}

function Helper(name, tieNameF) {
    /* the pop-up helper name */
    if (!name || name == "") {
        this.helperName = HelperGenerateName();
    } else {
        this.helperName = name;
    }
    /* object this helper object is tied to */
    this.tieNameF = tieNameF;
    this.instantiated = false;
    this.helpHtml = "";
    this.helpTitle = "";
    return this;
}

Helper.prototype.instantiate = function(anchor) {
    var helper = '#' + this.helperName;
    var tie = this.tieNameF;
    var helperObj = this;
    //var str = '<div id="'+this.helperName+'" class="ho-helper"><img src="images/circle.gif"></div>';
    var str = '<img id="'+this.helperName+'" class="ho-helper" src="images/circle.png">';
    $(anchor).append(str);

    $(helper).bind('click', function() {
        //jAlert(helperObj.helpHtml, helperObj.helpTitle);
        alert(helperObj.helpHtml);
    });
    this.hide();
    this.updatePosition();
    this.instantiated = true;
    return this;
}

Helper.prototype.hide = function() {
    var helper = '#' + this.helperName;
    $(helper).hide();
}

Helper.prototype.show = function() {
    var helper = '#' + this.helperName;
    $(helper).show();
}

Helper.prototype.setHelpHtml = function(helpHtml) {
    this.helpHtml = helpHtml;
}

Helper.prototype.setHelpTitle = function(helpTitle) {
    this.helpTitle = helpTitle;
}

Helper.prototype.updatePosition = function() {
    var helper = '#' + this.helperName;
    var offset = calcCenterObjAbs(this.tieNameF, helper);
    $(helper).css('position', 'absolute');
    $(helper).css('top', offset.top + 'px');
    $(helper).css('left', offset.left + 'px');
}

function HelpOverlay(name, anchor) {
    /* semi-transparent full-screen overlay */
    this.containerName = 'container-'+name;
    this.overlayName = name;
    this.helpers = [];
    this.isHidden = true;

    createContainer(this.containerName, anchor);
    createOverlay(name, '#'+this.containerName);
//    createOverlay(name, anchor);
}

HelpOverlay.prototype.add = function(text, title, tieNameF) {
    var helper = new Helper(null, tieNameF);
    helper.setHelpHtml(text);
    helper.setHelpTitle(title);
    this.addHelper(helper);
}

HelpOverlay.prototype.addHelper = function(helper) {
    var container = '#' + this.containerName;
    helper.instantiate(container);
    this.helpers.push(helper);
}

HelpOverlay.prototype.hide = function() {
    var overlay = '#' + this.overlayName;
    var container = '#' + this.containerName;
    $(container).hide();
    $(overlay).hide();
    $.each(this.helpers, function(index, helper) {
        helper.hide();
    });
    this.isHidden = true;
}

HelpOverlay.prototype.show = function() {
    var overlay = '#' + this.overlayName;
    var container = '#' + this.containerName;

    $.each(this.helpers, function(index, helper) {
        helper.updatePosition();
        helper.show();
    });

    $(overlay).height($(document).height());
    $(container).height($(document).height());
    $(container).show();
    $(overlay).show();
    this.isHidden = false;
}

function createOverlay(name, anchor) {
    var nameF = '#'+name;
    $(anchor).append('<div id="'+name+'" class="ho-overlay"><img id="closeImage" align="left" style="padding-top: 20px; padding-left: 20px" src="images/x.png"></div>');
    $('#closeImage').bind('click', function(event) {
        courseBookHO.hide();
    });
}

function createContainer(name, anchor) {
    var nameF = '#'+name;
    $(anchor).append('<div id="'+name+'" class="ho-container"></div>');
}
