import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, Mail, MessageSquare, Star, Calendar, 
  Globe, MapPin, Award, Users, Car, CheckCircle,
  ExternalLink, Send, User
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  getSalesProfileBySlug, 
  getProfileTestimonials,
  getProfileFeaturedVehicles,
  trackLeadCapture,
  type SalesProfile,
  type ProfileTestimonial,
  type FeaturedVehicle
} from '@/services/salesProfileService';
import { supabase } from '@/integrations/supabase/client';

const PublicSalesProfile = () => {
  const { profileSlug } = useParams<{ profileSlug: string }>();
  const [profile, setProfile] = useState<SalesProfile | null>(null);
  const [testimonials, setTestimonials] = useState<ProfileTestimonial[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<FeaturedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadFormData, setLeadFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    vehicleInterest: '',
    message: '',
    preferredContact: 'phone' as 'phone' | 'email' | 'text'
  });
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  useEffect(() => {
    if (profileSlug) {
      loadProfileData();
    }
  }, [profileSlug]);

  const loadProfileData = async () => {
    if (!profileSlug) return;

    try {
      setLoading(true);
      
      const [profileData, testimonialsData, vehiclesData] = await Promise.all([
        getSalesProfileBySlug(profileSlug),
        getSalesProfileBySlug(profileSlug).then(p => p ? getProfileTestimonials(p.id) : []),
        getSalesProfileBySlug(profileSlug).then(p => p ? getProfileFeaturedVehicles(p.id) : [])
      ]);

      setProfile(profileData);
      if (profileData) {
        setTestimonials(testimonialsData);
        setFeaturedVehicles(vehiclesData);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!leadFormData.firstName || !leadFormData.lastName || (!leadFormData.email && !leadFormData.phone)) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your name and at least one contact method',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmittingLead(true);

      // Create lead in database
      const leadData = {
        first_name: leadFormData.firstName,
        last_name: leadFormData.lastName,
        email: leadFormData.email || null,
        address: null,
        city: null,
        state: null,
        postal_code: null,
        vehicle_interest: leadFormData.vehicleInterest || 'interested in learning more',
        source: `Sales Profile - ${profile.display_name}`,
        status: 'new',
        salesperson_id: profile.user_id,
        notes: leadFormData.message || null,
        preferred_contact_method: leadFormData.preferredContact,
        do_not_call: false,
        do_not_email: false,
        do_not_mail: false
      };

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (leadError) throw leadError;

      // Add phone number if provided
      if (leadFormData.phone && lead) {
        await supabase
          .from('phone_numbers')
          .insert({
            lead_id: lead.id,
            number: leadFormData.phone,
            type: 'mobile',
            is_primary: true,
            status: 'active',
            priority: 1
          });
      }

      // Track lead capture
      await trackLeadCapture(profile.id);

      setLeadSubmitted(true);
      toast({
        title: 'Thank You!',
        description: `${profile.display_name} will be in touch with you soon.`,
      });

      // Reset form
      setLeadFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        vehicleInterest: '',
        message: '',
        preferredContact: 'phone'
      });

    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: 'Submission Failed',
        description: 'Please try again or contact us directly.',
        variant: 'destructive'
      });
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleCall = () => {
    if (profile?.phone_number) {
      window.location.href = `tel:${profile.phone_number}`;
    }
  };

  const handleEmail = () => {
    if (profile?.email) {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/404" replace />;
  }

  const primaryColor = profile.personal_brand_colors?.primary || '#2563eb';
  const secondaryColor = profile.personal_brand_colors?.secondary || '#64748b';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div 
        className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
        }}
      >
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-32 h-32 bg-white/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <User className="w-16 h-16" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {profile.display_name}
            </h1>
            
            <p className="text-xl mb-6 opacity-90">
              {profile.title}
            </p>
            
            {profile.custom_message && (
              <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
                {profile.custom_message}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              {profile.phone_number && (
                <Button 
                  onClick={handleCall}
                  className="bg-white text-blue-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </Button>
              )}
              {profile.email && (
                <Button 
                  onClick={handleEmail}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-blue-600 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email Me
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    About Me
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profile.bio && (
                    <p className="text-gray-700 leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.years_experience && (
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold">Experience</p>
                          <p className="text-gray-600">{profile.years_experience} years</p>
                        </div>
                      </div>
                    )}

                    {profile.languages_spoken && profile.languages_spoken.length > 0 && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold">Languages</p>
                          <p className="text-gray-600">{profile.languages_spoken.join(', ')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {profile.specialties && profile.specialties.length > 0 && (
                    <div>
                      <p className="font-semibold mb-3">Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.specialties.map((specialty, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Featured Vehicles */}
              {profile.show_inventory && featuredVehicles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      Featured Vehicles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {featuredVehicles.map((vehicle) => (
                        <div key={vehicle.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          {vehicle.inventory?.primary_image_url && (
                            <img
                              src={vehicle.inventory.primary_image_url}
                              alt={`${vehicle.inventory.year} ${vehicle.inventory.make} ${vehicle.inventory.model}`}
                              className="w-full h-40 object-cover rounded-lg mb-4"
                            />
                          )}
                          <div className="space-y-2">
                            <h4 className="font-semibold">
                              {vehicle.inventory?.year} {vehicle.inventory?.make} {vehicle.inventory?.model}
                            </h4>
                            {vehicle.inventory?.price && (
                              <p className="text-lg font-bold text-green-600">
                                ${vehicle.inventory.price.toLocaleString()}
                              </p>
                            )}
                            {vehicle.custom_description && (
                              <p className="text-gray-600 text-sm">
                                {vehicle.custom_description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Stock #{vehicle.inventory?.stock_number}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Testimonials */}
              {profile.show_testimonials && testimonials.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Customer Reviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {testimonials.slice(0, 3).map((testimonial) => (
                        <div key={testimonial.id} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <p className="text-gray-700 mb-2 italic">
                            "{testimonial.testimonial_text}"
                          </p>
                          <div className="text-sm text-gray-600">
                            <p className="font-semibold">{testimonial.customer_name}</p>
                            {testimonial.customer_location && (
                              <p>{testimonial.customer_location}</p>
                            )}
                            {testimonial.vehicle_purchased && (
                              <p className="text-blue-600">{testimonial.vehicle_purchased}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Lead Capture Form */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {leadSubmitted ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Thank You!
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5" />
                        Get In Touch
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leadSubmitted ? (
                    <div className="text-center space-y-4">
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Message Sent!</h3>
                        <p className="text-gray-600">
                          {profile.display_name} will contact you soon.
                        </p>
                      </div>
                      <Button 
                        onClick={() => setLeadSubmitted(false)}
                        variant="outline"
                        className="w-full"
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleLeadSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={leadFormData.firstName}
                            onChange={(e) => setLeadFormData(prev => ({ ...prev, firstName: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={leadFormData.lastName}
                            onChange={(e) => setLeadFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={leadFormData.email}
                          onChange={(e) => setLeadFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={leadFormData.phone}
                          onChange={(e) => setLeadFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="vehicleInterest">Vehicle Interest</Label>
                        <Input
                          id="vehicleInterest"
                          value={leadFormData.vehicleInterest}
                          onChange={(e) => setLeadFormData(prev => ({ ...prev, vehicleInterest: e.target.value }))}
                          placeholder="What type of vehicle are you looking for?"
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={leadFormData.message}
                          onChange={(e) => setLeadFormData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Tell me about your needs..."
                          rows={3}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full flex items-center gap-2"
                        disabled={submittingLead}
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Send className="w-4 h-4" />
                        {submittingLead ? 'Sending...' : 'Send Message'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Social Links */}
              {Object.values(profile.social_links).some(link => link) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Connect With Me</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile.social_links.linkedin && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(profile.social_links.linkedin, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        LinkedIn
                      </Button>
                    )}
                    {profile.social_links.facebook && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(profile.social_links.facebook, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Facebook
                      </Button>
                    )}
                    {profile.social_links.instagram && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(profile.social_links.instagram, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Instagram
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicSalesProfile;