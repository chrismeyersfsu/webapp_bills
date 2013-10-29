import cgi
import urllib, urllib2, Cookie
import cookielib
import re
import logging
import time
import simplejson

from urlparse import urlparse
from flask import Flask, request, make_response
from flask.views import MethodView
app = Flask(__name__)

################################################################################
class MyHTTPRedirectHandler(urllib2.HTTPRedirectHandler):
	def http_error_302(self, req, fp, code, msg, headers):
		print "Redirect handler"
		return urllib2.HTTPRedirectHandler.http_error_302(self, req, fp, code, msg, headers)

	http_error_301 = http_error_303 = http_error_307 = http_error_302

class URLOpener:
	def __init__(self):
		self.cookie = Cookie.SimpleCookie()
		self.jSessionId = ""
	
	def open(self, url, data = None):
		print "Called URLOpener open(%s)\n" % (url)
		while url is not None:
			try:
				o = urlparse(url)
				path = o.path
				str = "Getting url ["+url+"] cookie ["+self._makeCookieHeader(path)+"]"
				if data != None:
					str += " data ["+data+"]"
#			logging.debug(str)
				req = urllib2.Request(url, data, self._getHeaders(path))
				handler_redirect = MyHTTPRedirectHandler()
				opener = urllib2.build_opener(urllib2.HTTPHandler(debuglevel=1), handler_redirect)
				urllib2.install_opener(opener)
				#response = opener.open(req)
				response = urllib2.urlopen(req)

				data = None # Next request will be a get, so no need to send the data again. 
				cookieStr = response.headers.get('Set-cookie', '')
				if self.jSessionId == "":
					if cookieStr.find("JSESSIONID") != -1:
						pattern = re.compile('JSESSIONID=(.*?);')
						match = pattern.search(cookieStr)
						if match != None:
							self.jSessionId = match.group(1)
#			logging.debug("Received cookies: ["+cookieStr + "]\n")
				self.cookie.load(response.headers.get('Set-cookie', '')) # Load the cookies from the response
# Change cookie to the gathered JSESSIONID
				url = response.headers.get('location')
			except urllib2.URLError, e:
				logging.error("Generic error")
				self.response.out.write("Error")
				handleError(e)
			#except DownloadError:
			#	logging.error("Download error")
			#except:
			#	logging.error("Other error")
		return response
		
	def _getHeaders(self, path):
		headers = {
#			'Content-Type': 'text/html',
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
#			if v.key == "JSESSIONID":
#				if self.jSessionId != "":
#					logging.debug("\n==== Replaced jsession ====\n")
#					v.value = self.jSessionId
			if 'path' in v:
				if path.find(v['path'], 0, len(v['path'])) != -1:
#				logging.debug("\n==== "+v['path']+" ====\n")
					cookieHeader += "%s=%s; " % (v.key, v.value)
				elif v["path"] == "/,":
#				logging.debug("\n==== "+v['path']+" ====\n")
					cookieHeader += "%s=%s; " % (v.key, v.value)
				else:
#				logging.debug("\n==== Not Including "+v['path']+" ====\n")
					True
			else:
				cookieHeader += "%s=%s; " % (v.key, v.value)

#		return self.cookie.output("")
		return cookieHeader

class BlackBoard(MethodView):
	urlLogin = 'https://bb5.fsu.edu/cas/'
	urlSession = 'https://bb5.fsu.edu/cas/login?loginurl=https%3A%2F%2Fapps.oti.fsu.edu%2FSecureLogin%2FLogin&service=https%3A%2F%2Fapps.oti.fsu.edu%2FSecureLogin%2FAuthenticator%3Fnoheader%3Dtrue%26nofooter%3Dtrue'
#	urlSecureApps = 'https://apps.oti.fsu.edu/SecureLogin/servlet/PortalHandler'
	urlSecureApps = 'https://apps.oti.fsu.edu/SecureLogin/login?noheader=true&nofooter=true'
	urlSchedule = 'https://apps.oti.fsu.edu/StudentClassSchedule/Schedule'

	def handleError(self, err):
		return make_response(simplejson.dumps(err), None)

	def get(self):
		username = request.args.get('username');
		password = request.args.get('password');
		year = request.args.get('year', 2011);
		term = request.args.get('term', 9);
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
			data = result.read()

			pattern = re.compile('window.location.href="(.*?)"')
			match = pattern.search(data)
			if match != None:
				urlRedirect = match.group(1)
# Complete login process
# by following window.location.href
				result = urlhandler.open(urlRedirect)
				data = result.read()
				return make_response('1', None)
			else:
				return make_response('0', None)
		except urllib2.URLError, e:
			self.response.out.write("Error")
			self.handleError(e)
			return make_response('error', None)
#			handleError(e)

###############################################################################
# the code above is short circuited to return 
# 0, invalid login 
# 1, success
# 'error'
###############################################################################

# Session
#		try:
#			result = urlhandler.open(self.urlSession)
#			data = result.content
#			self.response.out.write(data)

#		except urllib2.URLError, e:
#			self.response.out.write("Error")
#			handleError(e)

# Secure apps
		try:
# Setup the session
			result = urlhandler.open(self.urlSecureApps)
			data = result.read()
#			logging.debug(data)

# Submit accept
			post_data = urllib.urlencode({'submit' : 'Accept'})
			result = urlhandler.open(self.urlSecureApps, post_data)
			data = result.read()
#			logging.debug(data)

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
				data = result.read()
#			logging.debug(data)

#			pattern = re.compile('<a target="" href="(.*?)">My Class Schedule</a>')
#			match = pattern.search(data) 
#			if match != None:
#				urlRedirect = match.group(1)
#				result = urlhandler.open('https://apps.oti.fsu.edu/'+urlRedirect)
#				data = result.content
#				logging.debug(data)

				post_data = urllib.urlencode({
				'CALLINGURI' : '/jsp/schedule_index.jsp',
				'refer' : 'null',
				'YEAR' : year,
				'TERM' : term,
				'genSched' : 'Generate A Schedule'
				})
				result = urlhandler.open(self.urlSchedule, post_data)
				data = result.read()

				if data.find("<title>Student Error Page</title>") == -1:
					break

#			logging.debug(data)
#			self.response.out.write(urlhandler._makeCookieHeader())
#			self.response.out.write(data)

#			result = urlhandler.open('https://campus.fsu.edu/webapps/login?action=logout')

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

if __name__ == "__main__":
	app.add_url_rule("/bb", view_func=BlackBoard.as_view('bb'))
	app.run(host='0.0.0.0',debug=True)
