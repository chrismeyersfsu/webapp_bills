#http://billsbookstorefsu.appspot.com/bb?username=&password=&year=2012&term=9 <-- fall
#http://billsbookstorefsu.appspot.com/bb?username=&password=&year=2012&term=6 <-- summer
#http://billsbookstorefsu.appspot.com/bb?username=&password=&year=2012&term=1 <-- spring

import cgi
import urllib, urllib2, Cookie
import cookielib
import re
import logging
import time

from urlparse import urlparse
from django.utils import simplejson
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import urlfetch

################################################################################
class URLOpener:
  def __init__(self):
      self.cookie = Cookie.SimpleCookie()
      self.jSessionId = ""
    
  def open(self, url, data = None):
      if data is None:
          method = urlfetch.GET
      else:
          method = urlfetch.POST
    
      while url is not None:
        try:
            o = urlparse(url)
            path = o.path
            str = "Getting url ["+url+"] cookie ["+self._makeCookieHeader(path)+"]"
            if data != None:
                str += " data ["+data+"]"
#            logging.debug(str)
            response = urlfetch.fetch(url=url,
                          payload=data,
                          method=method,
                          headers=self._getHeaders(path),
                          allow_truncated=False,
                          follow_redirects=False,
                          deadline=10
                          )
            data = None # Next request will be a get, so no need to send the data again. 
            method = urlfetch.GET
            cookieStr = response.headers.get('Set-cookie', '')
            if self.jSessionId == "":
                if cookieStr.find("JSESSIONID") != -1:
                    pattern = re.compile('JSESSIONID=(.*?);')
                    match = pattern.search(cookieStr)
                    if match != None:
                        self.jSessionId = match.group(1)
#            logging.debug("Received cookies: ["+cookieStr + "]\n")
            self.cookie.load(response.headers.get('Set-cookie', '')) # Load the cookies from the response
# Change cookie to the gathered JSESSIONID
            url = response.headers.get('location')
        except urllib2.URLError, e:
            logging.error("Generic error")
            self.response.out.write("Error")
            handleError(e)
        #except DownloadError:
        #    logging.error("Download error")
        #except:
        #    logging.error("Other error")
      return response
        
  def _getHeaders(self, path):
      headers = {
#            'Content-Type': 'text/html',
            'User-agent': "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.12) Gecko/20101026 Firefox/3.6.12",
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Keep-Alive': '300',
            'Connection': 'keep-alive',
            'Accept-Language': 'en-us,en;q=0.5',
            'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
           'Cookie' : self._makeCookieHeader(path)
           }
      return headers

  def _makeCookieHeader(self, path):
      cookieHeader = ""
      logStr = ""
      for k,v in self.cookie.items():
#          if v.key == "JSESSIONID":
#              if self.jSessionId != "":
#                  logging.debug("\n==== Replaced jsession ====\n")
#                  v.value = self.jSessionId
          if 'path' in v:
            if path.find(v['path'], 0, len(v['path'])) != -1:
#                logging.debug("\n==== "+v['path']+" ====\n")
                cookieHeader += "%s=%s; " % (v.key, v.value)
            elif v["path"] == "/,":
#                logging.debug("\n==== "+v['path']+" ====\n")
                cookieHeader += "%s=%s; " % (v.key, v.value)
            else:
#                logging.debug("\n==== Not Including "+v['path']+" ====\n")
                True
          else:
            cookieHeader += "%s=%s; " % (v.key, v.value)

#      return self.cookie.output("")
      return cookieHeader


################################################################################

class BooksParser:
    result = ""
    results = ""
    posList = ""
    posEndList = ""
    data = ""
    count = 0
    regex = {
            'requirement': "<tr class=\"book course-(?P<requirement>[\w ]+)\">",
            'image': "<td class=\"book-cover\"><a href=\"(?P<image>.*?)\"",
            'title': '<span class=\"book-title\">(?P<title>.*?)</span>',
            'author': '<span class=\"book-meta book-author\">(?P<author>.*?)</span>',
            'isbn': '<span class=\"isbn\">(?P<isbn>\d+)</span>',
            'copyright': '<span class=\"book-meta book-copyright\">(?P<copyright>.*?)</span>',
            'publisher': '<span class=\"book-meta book-publisher\">(?P<publisher>.*?)</span>',
            'edition': '<span class=\"book-meta book-edition\">(?P<edition>.*?)</span>',
            'binding': '<span class=\"book-meta book-binding\">(?P<binding>.*?)</span>',
            'priceNew': "<input type=\"hidden\" name=\"product-new-price-\d+\" id=\"product-new-price-\d+\" value=\"(?P<priceNew>\d+)\" />",
            'priceUsed': "<input type=\"hidden\" name=\"product-used-price-\d+\" id=\"product-used-price-\d+\" value=\"(?P<priceUsed>\d+)\" />",
            'priceNewRent': "<input type=\"hidden\" name=\"product-new-rental-price-\d+\" id=\"product-new-rental-price-\d+\" value=\"(?P<priceNewRent>\d+)\" />",
            'priceUsedRent': "<input type=\"hidden\" name=\"product-used-rental-price-\d+\" id=\"product-used-rental-price-\d+\" value=\"(?P<priceUsedRent>\d+)\" />",
            'availNew': "<td class=\"price\"><label for=\"radio-sku-new_\d+\">(?P<availNew>.*?)</label>",
            'availUsed': "<td class=\"price\"><label for=\"radio-sku-used_\d+\">(?P<availUsed>.*?)</label>",
            'availNewRent': "<td class=\"price\"><label for=\"radio-radio-sku-new-rental_\d+\">(?P<availNewRent>.*?)</label>",
            'availUsedRent': "<td class=\"price\"><label for=\"radio-radio-sku-used-rental_\d+\">(?P<availUsedRent>.*?)</label>",
            'pfId': "<input type=\"hidden\" name=\"pf_id-\d+\" id=\"pf_id-\d+\" value=\"(\d+)\"",
            'skuNew': '<input type=\"radio\" class=\"product-sku\" id=\"radio-sku-new_\d+\" name=\"sku_1\" value=\"(\d+)\"',
            'skuNewRent': '<input type=\"radio\" class=\"product-sku\" id=\"radio-radio-sku-new-rental_\d+\" name=\"sku_1\" value=\"(\d+)\"',
            'skuUsed': '<input type=\"radio\" class=\"product-sku\" id=\"radio-sku-used_\d+\" name=\"sku_1\" value=\"(\d+)\"',
            'skuUsedRent': '<input type=\"radio\" class=\"product-sku\" id=\"radio-radio-sku-used-rental_\d+\" name=\"sku_1\" value=\"(\d+)\"'
            }

    regexKeys = [ 'requirement', 'image', 'title', 'author', 'isbn', 'copyright', 'publisher', 'edition', 'binding', 'priceNew', 'priceUsed', 'priceNewRent', 'priceUsedRent', 'priceUsed', 'availNew', 'availUsed', 'availNewRent', 'availUsedRent', 'pfId', 'skuNew', 'skuNewRent', 'skuUsed', 'skuUsedRent'];

    def __init__(self):
        self.results = list()
        self.posList = list()
        self.posEndList = list()
        self.data = ""
        self.count = 0
        self.result = {
                'requirement': "",
                'image': "",
                'priceNew': "",
                'priceUsed': "",
                'priceNewRent': "",
                'priceUsedRent': "",
                'availNew': "",
                'availUsed': "",
                'availNewRent': "",
                'availUsedRent': "",
                'isbn': ""
              }
    def setData(self, data):
        self.data = data;
    def setup(self):
        # Cut down the size of data
        # Remove the recommended products
# TO-DO: support Recommended Products
        endOffset = self.data.find("Recommended Products")
        if endOffset != -1:
            self.data = self.data[0:endOffset]
        count = 0

        # For each item (book) all regex strings may not be found
        # We take care to associate meta-data with the correct book
        # Assume that the first regex is always found, search the whole
        # data books for all occurences of the first regex and note the offsets
        # Then, only search between these books 
        k = self.regexKeys[0]
        matchIter = re.finditer(self.regex[k], self.data)
        startPrev = 0
        endPrev = 0
        flagFirst = True
        for match in matchIter:
            start = match.start(0)
            end = match.end(0)
            if flagFirst == True:
                flagFirst = False
            else:
                self.posList.append(startPrev)
                self.posEndList.append(start)
            startPrev = start
            endPrev = end
            count += 1

        # Add the final entry
        self.posList.append(start)
        self.posEndList.append(len(self.data))
        self.posList.reverse()
        self.posEndList.reverse()

    def next(self):
        if len(self.posList) == 0:
            return False
        pos = self.posList.pop()
        posEnd = self.posEndList.pop()
        for k in self.regexKeys:
            pattern = re.compile(self.regex[k])
            match = pattern.search(self.data, pos, posEnd)
            if match == None:
                self.result[k] = "NOT_FOUND"  # fill result with nothing
            else:
                self.result[k] = match.group(1)
#        self.results.append(self.result)
        self.results.append(dict(self.result))
#        self.results.append("%d %s" % (len(self.posList), "World"))
        return True
       
class CampusTerm(webapp.RequestHandler):
    url = "http://www.billsbookstore.com/"
    regexSelect = '<select name=\"selTerm\" id=\"fTerm\" class=\"box\" title=\"Select a campus term\">(?P<select>.*?)</select>'
    regexOption = '<option value=\"(\d+)\|(\d+)\">(.*?)</option>'

    def get(self):
        urlFull = self.url

        try:
            result = urllib2.urlopen(urlFull)
            data = result.read()
            
            pattern = re.compile(self.regexSelect)
            match = pattern.search(data)
            datatmp = match.group(1)

            pattern = re.compile(self.regexOption)
            pos = 0;
            results = list()
            while True:
                match = pattern.search(datatmp, pos)
                if match == None:
                    break;
                results.append({ 'campustermId' : match.group(1)+'|'+match.group(2), 'campusId' : match.group(1), 'termId' : match.group(2), 'campusName' : match.group(3) })
                pos = match.end(0)

        
            self.response.out.write(simplejson.dumps(results))
        except urllib2.URLError, e:
            handleError(e)



class Department(webapp.RequestHandler):
    url = "http://www.billsbookstore.com/textbooks_xml.asp?control=campus"
    regexDept = '<department id=\"(\d+)\" abrev=\"(.*?)\" name=\"(.*?)\" />'

    def get(self):
        dept = self.request.get('campus')
        term = self.request.get('term')
        urlFull = self.url+'&campus='+dept+'&term='+term

        try:
            result = urllib2.urlopen(urlFull)
            data = result.read()
            
            pattern = re.compile(self.regexDept)
            pos = 0;
            results = list()
            while True:
                match = pattern.search(data, pos)
                if match == None:
                    break;
                results.append({ 'deptId' : match.group(1), 'deptAbrev': match.group(2), 'deptName' : match.group(3) })
                pos = match.end(0)
        
            self.response.out.write(simplejson.dumps(results))
        except urllib2.URLError, e:
            handleError(e)

class Course(webapp.RequestHandler):
    url = "http://www.billsbookstore.com/textbooks_xml.asp?control=department"
    regexCourse = '<course id=\"(\d+)\" name=\"(\d+)\s+\" />'

    def get(self):
        dept = self.request.get('dept')
        term = self.request.get('term')
        urlFull = self.url+'&dept='+dept+'&term='+term

        try:
            result = urllib2.urlopen(urlFull)
            data = result.read()
            
            pattern = re.compile(self.regexCourse)
            pos = 0;
            results = list()
            while True:
                match = pattern.search(data, pos)
                if match == None:
                    break;
                results.append({ 'courseId' : match.group(1), 'courseNumber' : match.group(2) })
                pos = match.end(0)
        
            self.response.out.write(simplejson.dumps(results))
        except urllib2.URLError, e:
            handleError(e)

class Section(webapp.RequestHandler):
    url = "http://www.billsbookstore.com/textbooks_xml.asp?control=course"
    regexSection = '<section id=\"(\d+)\" name=\"(.*?)\" instructor=\"(.*?)\" />'

    def get(self):
        dept = self.request.get('course')
        term = self.request.get('term')
        urlFull = self.url+'&course='+dept+'&term='+term

        try:
            result = urllib2.urlopen(urlFull)
            data = result.read()
            
            pattern = re.compile(self.regexSection)
            pos = 0;
            results = list()
            while True:
                match = pattern.search(data, pos)
                if match == None:
                    break;
                results.append({ 'sectionId' : match.group(1), 'sectionName' : match.group(2), 'instructor' : match.group(3) })
                pos = match.end(0)
        
            self.response.out.write(simplejson.dumps(results))
        except urllib2.URLError, e:
            handleError(e)


class Books(webapp.RequestHandler):
    url = "http://www.billsbookstore.com/textbooks_xml.asp?control=section&section="

    def get(self):
        section = self.request.get('id');
#        section = "53867"   # Single book
#        section = "53857"  # Many books, and a PRS clicker        
#        section = "55512"   # Multiple books, single section
        urlFull = self.url+section

        try:
            sp = BooksParser()
            result = urllib2.urlopen(urlFull)
            data = result.read()
            
            sp.setData(data)
            sp.setup()
            while sp.next():
                True
#                for k in sp.regexKeys:
#                    self.response.out.write(k + "=" + sp.result[k] + "<br>\n")
            self.response.out.write(simplejson.dumps(sp.results))
        except urllib2.URLError, e:
            handleError(e)

class BlackBoard(webapp.RequestHandler):
    urlLogin = 'https://bb5.fsu.edu/cas/'
    urlSession = 'https://bb5.fsu.edu/cas/login?loginurl=https%3A%2F%2Fapps.oti.fsu.edu%2FSecureLogin%2FLogin&service=https%3A%2F%2Fapps.oti.fsu.edu%2FSecureLogin%2FAuthenticator%3Fnoheader%3Dtrue%26nofooter%3Dtrue'
#    urlSecureApps = 'https://apps.oti.fsu.edu/SecureLogin/servlet/PortalHandler'
    urlSecureApps = 'https://apps.oti.fsu.edu/SecureLogin/login?noheader=true&nofooter=true'
    urlSchedule = 'https://apps.oti.fsu.edu/StudentClassSchedule/Schedule'

    def handleError(self, err):
        self.response.out.write(simplejson.dumps(err))

    def get(self):
        username = self.request.get('username');
        password = self.request.get('password');
        year = self.request.get('year', 2011);
        term = self.request.get('term', 9);
        urlhandler = URLOpener()
        urlhandler.cookie.clear()

# Login    
        try:
            post_data = urllib.urlencode({
                'username':username,
                 'password': password,
                 'service': 'https://campus.fsu.edu/webapps/login/',
                 'loginurl': 'https://campus.fsu.edu/webapps/login/bb_bb60/logincas.jsp',
                 'x': 0,
                 'y': 0
                 })
            result = urlhandler.open(self.urlSession, post_data)
            data = result.content
#            logging.debug(data)

            pattern = re.compile('window.location.href="(.*?)"')
            match = pattern.search(data)
            if match != None:
                urlRedirect = match.group(1)
# Complete login process
# by following window.location.href
                result = urlhandler.open(urlRedirect)
                data = result.content
#                logging.debug(data)
        except urllib2.URLError, e:
            self.response.out.write("Error")
            self.handleError(e)
            return
        except urlfetch.DownloadError:
            self.handleError({'error': "Login failed", 'reason': "Download timed out"});
            return
#            handleError(e)

# Session
#        try:
#            result = urlhandler.open(self.urlSession)
#            data = result.content
#            self.response.out.write(data)

#        except urllib2.URLError, e:
#            self.response.out.write("Error")
#            handleError(e)

# Secure apps
        try:
# Setup the session
            result = urlhandler.open(self.urlSecureApps)
            data = result.content
#            logging.debug(data)

# Submit accept
            post_data = urllib.urlencode({'submit' : 'Accept'})
            result = urlhandler.open(self.urlSecureApps, post_data)
            data = result.content
#            logging.debug(data)

        except urllib2.URLError, e:
            self.response.out.write("Error")
            handleError(e)

        countLoop = 0
# Get schedule
        try:
# Grab the list of "secure apps" links
            while True:
                countLoop += 1
                result = urlhandler.open(self.urlSchedule)
                data = result.content
#            logging.debug(data)

#            pattern = re.compile('<a target="" href="(.*?)">My Class Schedule</a>')
#            match = pattern.search(data) 
#            if match != None:
#                urlRedirect = match.group(1)
#                result = urlhandler.open('https://apps.oti.fsu.edu/'+urlRedirect)
#                data = result.content
#                logging.debug(data)

                post_data = urllib.urlencode({
                'CALLINGURI' : '/jsp/schedule_index.jsp',
                'refer' : 'null',
                'YEAR' : year,
                'TERM' : term,
                'genSched' : 'Generate A Schedule'
                })
                result = urlhandler.open(self.urlSchedule, post_data)
                data = result.content

                if data.find("<title>Student Error Page</title>") == -1:
                    break

#            logging.debug(data)
#            self.response.out.write(urlhandler._makeCookieHeader())
#            self.response.out.write(data)

#            result = urlhandler.open('https://campus.fsu.edu/webapps/login?action=logout')

            logging.debug("Loop count [%d" % (countLoop) +"]")
            
            matchIter = re.finditer('<td class="only" align=".*?">(.*?)</td>', data)
            count=0
            matchKeys = [ 'alert', 'num', 'course', 'section', 'session', 'sectionId', 'title', 'hours', 'building', 'room', 'days', 'begin', 'end' ]
            countMax = len(matchKeys)
            schedule = []
            klass = {}
# TODO: alert element will have some extra html in it (<span></span>)
            for match in matchIter:
                klass[matchKeys[count]] = match.group(1)
                count += 1
                if count == countMax:
                    schedule.append(klass)
                    count = 0
                    klass = {}

            self.response.out.write(simplejson.dumps(schedule))

        except urllib2.URLError, e:
            self.response.out.write("Error")
            handleError(e)

application = webapp.WSGIApplication([('/campusterm', CampusTerm),
                                      ('/dept', Department),
                                      ('/course', Course),
                                      ('/section', Section),
                                      ('/books', Books),
                                      ('/bb', BlackBoard)],
                                      debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
