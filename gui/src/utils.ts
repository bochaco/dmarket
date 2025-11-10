import { getOfferStatus, OfferedItem, UserRole, User, Offer } from "./types";
import {
  type DMarketDerivedState,
  type DeployedDMarketAPI,
} from "../../api/src/index";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";

export const carriersAsUsers = (dMarketState: DMarketDerivedState): User[] => {
  const users = [];
  for (const [id, carrier] of dMarketState.carriers) {
    const carrierMeta = deserializeUserMetadataJson(carrier.meta);
    const carrierUser: User = {
      id,
      name: carrierMeta.name,
      role: UserRole.Carrier,
      ratings: {
        average: 0n,
        count: 0n,
      },
    };
    users.push(carrierUser);
  }
  return users;
};

export const sellersAsUsers = (dMarketState: DMarketDerivedState): User[] => {
  const users = [];
  for (const [id, seller] of dMarketState.sellers) {
    const sellerMeta = deserializeUserMetadataJson(seller.meta);
    const sellerUser: User = {
      id,
      name: sellerMeta.name,
      role: UserRole.Seller,
      ratings: {
        average: 0n,
        count: 0n,
      },
    };
    users.push(sellerUser);
  }
  return users;
};

export const updatedOffers = (
  dMarketState: DMarketDerivedState,
  dMarketApi: DeployedDMarketAPI | undefined,
  updatedUsers: User[],
): Offer[] => {
  let updatedOffers = [];
  for (const [id, offer] of dMarketState.offers) {
    const offeredItem = deserializeItemMetadataJson(offer.meta);
    const sellerId = toHex(offer.seller);
    const sellerUser = updatedUsers.find((u) => u.id === sellerId);
    if (sellerUser) {
      const carrierBids = dMarketState.carrierBids.get(id);
      const bids = [];
      if (carrierBids) {
        for (const [carrierId, fee] of carrierBids) {
          const carrier = updatedUsers.find((u) => u.id === carrierId);
          if (carrier) {
            bids.push({ carrier, fee });
          }
        }
      }

      let purchaseDetails = null;
      if (offer.purchaseDetails.is_some) {
        const carrier = updatedUsers.find(
          (u) => u.id === toHex(offer.purchaseDetails.value.selectedCarrierId),
        );
        if (carrier) {
          const buyerId = toHex(offer.purchaseDetails.value.buyerId);
          const buyer: User = {
            id: buyerId,
            name: `${buyerId.substring(0, 6)}..${buyerId.substring(buyerId.length - 6)}`,
            role: UserRole.Buyer,
            ratings: {
              average: 0n,
              count: 0n,
            },
          };

          // calculate ratings for all users involved in this offer
          for (const rating of offer.sellerRatings) {
            sellerUser.ratings = calculateRatingAverage(
              sellerUser.ratings,
              rating,
            );
          }
          for (const rating of offer.carrierRatings) {
            carrier.ratings = calculateRatingAverage(carrier.ratings, rating);
          }

          for (const rating of offer.buyerRatings) {
            buyer.ratings = calculateRatingAverage(buyer.ratings, rating);
          }
          let b = updatedUsers.find((u) => u.id === buyerId);
          if (b) {
            b.ratings = buyer.ratings;
          } else {
            updatedUsers.push(buyer);
          }

          let deliveryAddress = "Unknown";
          if (dMarketApi) {
            try {
              deliveryAddress = dMarketApi.decrypt(
                offer.purchaseDetails.value.deliveryAddress,
              );
            } catch (error) {
              deliveryAddress = "Shielded";
            }
          }

          // set purchase details for this offer
          purchaseDetails = {
            deliveryFee: offer.purchaseDetails.value.carrierFee,
            deliveryAddress,
            carrier,
            buyer,
          };
        }
      }

      const o: Offer = {
        id: id,
        status: getOfferStatus(offer.state.valueOf()),
        eta:
          offer.deliveryEta > 0
            ? new Date(parseInt(offer.deliveryEta.toString()))
            : null,
        item: offeredItem,
        price: offer.price,
        seller: sellerUser,
        bids,
        purchaseDetails,
        ratings: {
          buyer: {
            ratedBySeller: offer.buyerRatings[0],
            ratedByCarrier: offer.buyerRatings[1],
          },
          seller: {
            ratedByCarrier: offer.sellerRatings[0],
            ratedByBuyer: offer.sellerRatings[1],
          },
          carrier: {
            ratedBySeller: offer.carrierRatings[0],
            ratedByBuyer: offer.carrierRatings[1],
          },
        },
      };
      updatedOffers.push(o);
    }
  }
  return updatedOffers;
};

const deserializeUserMetadataJson = (string: string): { name: string } => {
  try {
    // Attempt to parse the JSON string
    const parsedData = JSON.parse(string);
    return { name: parsedData.name };
  } catch (error) {
    return { name: "Unknown" };
  }
};

const deserializeItemMetadataJson = (string: string): OfferedItem => {
  try {
    // Attempt to parse the JSON string
    const parsedData = JSON.parse(string);
    const url = parseUrl(parsedData.imageUrl);
    return {
      name: parsedData.name,
      imageUrls: [url],
      description: `${parsedData.description.slice(0, 200)}...`,
    };
  } catch (error) {
    const url = parseUrl(string);
    return { name: "", imageUrls: [url], description: "" };
  }
};

const parseUrl = (urlStr: string): string => {
  try {
    const url = new URL(urlStr).href ? urlStr : "";
    return url;
  } catch (error) {
    return "";
  }
};

const calculateRatingAverage = (
  current: { average: bigint; count: bigint },
  rating: bigint,
): { average: bigint; count: bigint } => {
  if (rating === 0n) {
    // short-circiut as we don't count this rating
    return { average: current.average, count: current.count };
  }

  let average =
    (BigInt(current.average * current.count) + rating) /
    BigInt(current.count + 1n);
  return { average, count: current.count + 1n };
};
