// Shapes of the data the API sends back (money is always in paise).
import type { BookingStatus, PaymentPlan, PricingUnit } from "@heavyhire/shared";

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  iconUrl: string | null;
}

export interface Me {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  language: "EN" | "HI";
  role: "USER" | "ADMIN";
  vendor: { id: string; businessName: string; status: ApprovalStatus; rejectionReason: string | null } | null;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MachineStatus = ApprovalStatus | "PAUSED";

export interface MachineCard {
  id: string;
  brand: string;
  model: string;
  year: number;
  capacity: string | null;
  area: string | null;
  city: string;
  serviceRadiusKm: number;
  pricePerHour: number | null;
  pricePerDay: number | null;
  minHours: number;
  transportCharge: number;
  withOperator: boolean;
  fuelIncluded: boolean;
  ratingAvg: number;
  ratingCount: number;
  category: { slug: string; nameEn: string; nameHi: string };
  vendor: { businessName: string };
  photo: string | null;
  distanceKm: number | null;
}

export interface MachineDetail extends Omit<MachineCard, "photo" | "distanceKm" | "vendor"> {
  description: string | null;
  photos: string[];
  approxLat: number;
  approxLng: number;
  isRegistered: boolean;
  vendor: { businessName: string; createdAt: string };
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  renter: { name: string };
}

export interface PriceBreakdown {
  rate: number;
  quantity: number;
  rentAmount: number;
  transportAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  payNowAmount: number;
  payAtSiteAmount: number;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  unit: PricingUnit;
  quantity: number;
  startAt: string;
  endAt: string;
  siteAddress: string;
  siteLat: number;
  siteLng: number;
  notes: string | null;
  price: {
    rate: number;
    rentAmount: number;
    transportAmount: number;
    gstPercent: number;
    gstAmount: number;
    totalAmount: number;
    paymentPlan: PaymentPlan;
    payNowAmount: number;
    payAtSiteAmount: number;
    amountPaid: number;
    refundedAmount: number;
  };
  machine: {
    id: string;
    name: string;
    year: number;
    area: string | null;
    category: { slug: string; nameEn: string; nameHi: string };
    photo: string | null;
  };
  vendorReplyBy: string | null;
  cancelReason: string | null;
  rejectedReason: string | null;
  events: { status: BookingStatus; note: string | null; createdAt: string }[];
  review: { rating: number; comment: string | null } | null;
  createdAt: string;
}

export interface RenterBooking extends Booking {
  vendor: { businessName: string; phone: string | null };
  operator: { name: string | null; phone: string | null } | null;
  canCancel: boolean;
  canReview: boolean;
}

export interface VendorBooking extends Booking {
  renter: { name: string; phone: string | null };
  operator: { name: string | null; phone: string | null };
  commissionAmount: number;
  vendorAmount: number;
}

export interface VendorProfile {
  id: string;
  businessName: string;
  area: string | null;
  gstin: string | null;
  idDocType: "PAN" | "AADHAAR";
  hasIdDoc: boolean;
  upiId: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  status: ApprovalStatus;
  rejectionReason: string | null;
}

export interface VendorMachine {
  id: string;
  categoryId: string;
  brand: string;
  model: string;
  year: number;
  registrationNo: string | null;
  capacity: string | null;
  description: string | null;
  rcDocKey: string;
  area: string | null;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  pricePerHour: number | null;
  pricePerDay: number | null;
  minHours: number;
  transportCharge: number;
  fuelIncluded: boolean;
  status: MachineStatus;
  rejectionReason: string | null;
  ratingAvg: number;
  ratingCount: number;
  category: { id: string; slug: string; nameEn: string; nameHi: string };
  photos: { id: string; url: string; publicId: string }[];
  blocks?: { id: string; startAt: string; endAt: string; reason: string | null }[];
  _count?: { bookings: number };
}
