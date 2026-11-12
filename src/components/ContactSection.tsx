import React, { useState } from 'react';
import { AlertCircle, Mail, Phone, MapPin, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { sendContactMessage } from '../services/contactService';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  /** Bot bait. Kept off-screen so real visitors never fill it in. */
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against double clicks / Enter pressed twice while a send is running.
    if (isSubmitting) return;

    setError(null);
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in your name, email address and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendContactMessage({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        company,
      });
      // Only reached when the Edge Function confirms Resend accepted the email.
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Your message could not be sent right now. Please try again in a few minutes.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', subject: '', message: '' });
    setCompany('');
    setError(null);
    setSubmitted(false);
  };

  return (
    <section id="contact" className="py-16 md:py-22 bg-transparent dark:bg-[#0C1814] border-t border-emerald-900/10 dark:border-[#1F3D32] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto text-center mb-14">
          <span className="text-xs font-extrabold tracking-wider uppercase text-[#087F5B] dark:text-[#34D399] bg-white dark:bg-[#162C24] px-3.5 py-1 rounded-full border border-[#087F5B]/20 dark:border-[#285444] shadow-2xs">
            Get In Touch
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#20332D] dark:text-[#E5F4EE] tracking-tight mt-3 mb-3">
            Contact MediFind Directory Support
          </h2>
          <p className="text-sm sm:text-base text-[#20332D]/75 dark:text-[#E5F4EE]/75 leading-relaxed text-balance">
            Are you a pharmacy owner wishing to update your pharmacy listing, or a patient with feedback? Send our support team a note.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          
          {/* Info Side */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white dark:bg-[#162C24] p-6 sm:p-7 rounded-3xl border border-emerald-900/10 dark:border-[#24463B] shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-[#20332D] dark:text-[#E5F4EE]">
                Directory Office
              </h3>
              
              <div className="flex items-start gap-3 text-xs text-[#20332D]/75 dark:text-[#E5F4EE]/75 font-medium">
                <MapPin className="w-4 h-4 text-[#087F5B] dark:text-[#34D399] shrink-0 mt-0.5" />
                <span>Anna Salai, Thousand Lights, Chennai, Tamil Nadu 600006</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#20332D]/75 dark:text-[#E5F4EE]/75 font-medium">
                <Mail className="w-4 h-4 text-[#087E9B] shrink-0" />
                <a href="mailto:support@medifind.org" className="hover:text-[#087F5B] dark:hover:text-[#34D399]">
                  support@medifind.org
                </a>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#20332D]/75 dark:text-[#E5F4EE]/75 font-medium">
                <Phone className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>+91 44 2800 0000 (Support Helpline)</span>
              </div>

              <div className="pt-3 border-t border-emerald-900/5 dark:border-[#224538] text-[11px] text-[#20332D]/55 dark:text-[#E5F4EE]/55">
                Support Hours: Monday to Saturday, 9:00 AM – 6:00 PM IST
              </div>
            </div>

            <div className="bg-[#EBF7FA] dark:bg-[#142A33] p-4.5 rounded-3xl border border-[#087E9B]/25 text-xs text-[#155E75] dark:text-[#67E8F9]">
              <span className="font-extrabold block mb-1">Pharmacy Listing Inquiries</span>
              <p className="leading-relaxed">
                Pharmacies interested in listing their services in future releases can submit their catalog details for review.
              </p>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:col-span-3 bg-white dark:bg-[#162C24] p-6 sm:p-8 rounded-3xl border border-emerald-900/10 dark:border-[#24463B] shadow-sm">
            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B] text-[#087F5B] dark:text-[#34D399] flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-[#20332D] dark:text-[#E5F4EE]">Message Sent</h4>
                <p className="text-xs text-[#20332D]/70 dark:text-[#E5F4EE]/70 max-w-sm mx-auto leading-relaxed">
                  Your message has been sent to the MediFind support inbox. Our team will reply
                  to {formData.email} shortly.
                </p>
                <div className="pt-3">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 text-xs font-bold text-[#087F5B] dark:text-[#34D399] bg-[#EBF7F2] dark:bg-[#11231D] hover:bg-[#D1FAE5] rounded-xl transition-all cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot: hidden from people, tempting to bots. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="contact-company">Company</label>
                  <input
                    id="contact-company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] placeholder-[#20332D]/40 dark:placeholder-[#E5F4EE]/40 border border-emerald-900/10 dark:border-[#224538] rounded-2xl focus:bg-white dark:focus:bg-[#162C24] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] placeholder-[#20332D]/40 dark:placeholder-[#E5F4EE]/40 border border-emerald-900/10 dark:border-[#224538] rounded-2xl focus:bg-white dark:focus:bg-[#162C24] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Pharmacy update or general feedback"
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] placeholder-[#20332D]/40 dark:placeholder-[#E5F4EE]/40 border border-emerald-900/10 dark:border-[#224538] rounded-2xl focus:bg-white dark:focus:bg-[#162C24] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#20332D] dark:text-[#E5F4EE] mb-1.5">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write your inquiry or comments here..."
                    className="w-full px-3.5 py-2.5 text-xs font-medium bg-[#F1FAF6] dark:bg-[#11231D] text-[#20332D] dark:text-[#E5F4EE] placeholder-[#20332D]/40 dark:placeholder-[#E5F4EE]/40 border border-emerald-900/10 dark:border-[#224538] rounded-2xl focus:bg-white dark:focus:bg-[#162C24] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] font-semibold text-rose-700 dark:text-rose-300"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-[#087F5B] hover:bg-[#076B4D] active:bg-[#05573E] text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#087F5B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? 'Sending…' : 'Submit Message'}</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
