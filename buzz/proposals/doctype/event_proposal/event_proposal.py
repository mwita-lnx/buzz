# Copyright (c) 2025, BWH Studios and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils.data import get_url_to_form, getdate, today


class EventProposal(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		about: DF.TextEditor
		additional_notes: DF.SmallText | None
		amended_from: DF.Link | None
		category: DF.Link
		end_date: DF.Date | None
		end_time: DF.Time | None
		free_webinar: DF.Check
		host: DF.Link | None
		host_company: DF.Data | None
		host_company_logo: DF.AttachImage | None
		medium: DF.Literal["Online", "In Person"]
		naming_series: DF.Literal["EPR-.###"]
		short_description: DF.SmallText | None
		start_date: DF.Date
		start_time: DF.Time | None
		status: DF.Literal["Received", "In Review", "Approved", "Event Created", "Rejected"]
		title: DF.Data
	# end: auto-generated types

	def validate(self):
		self.validate_dates()
		self.validate_times()

	def validate_dates(self):
		if getdate(self.start_date) < getdate(today()):
			frappe.throw(_("Start Date cannot be in the past."))

		if self.end_date and getdate(self.end_date) < getdate(self.start_date):
			frappe.throw(_("End Date cannot be before Start Date."))

	def validate_times(self):
		if not self.start_time or not self.end_time:
			return

		same_day = not self.end_date or getdate(self.end_date) == getdate(self.start_date)
		if same_day and self.end_time <= self.start_time:
			frappe.throw(_("End Time must be after Start Time for same-day events."))

	def before_submit(self):
		if self.status not in ("Approved", "Rejected"):
			frappe.throw(_("Only Approved or Rejected proposals can be submitted."))

		self.create_event()

	def create_event(self):
		if self.status == "Rejected":
			return

		if not self.host:
			frappe.throw(_("Please create or set a Host before submitting the proposal."))

		buzz_event = get_mapped_doc(
			"Event Proposal", self.name, {"Event Proposal": {"doctype": "Buzz Event"}}
		)
		buzz_event.proposal = self.name
		buzz_event.insert()

		self.status = "Event Created"

		frappe.msgprint(
			_("Buzz Event {0} created successfully.").format(
				f'<a href="{get_url_to_form("Buzz Event", buzz_event.name)}">{buzz_event.title}</a>'
			)
		)
