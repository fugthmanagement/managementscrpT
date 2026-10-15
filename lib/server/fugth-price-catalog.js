// Verified FUGTH Management recurring prices. One source for checkout,
// subscription activation and the founder payment health dashboard.
export const PRICES={
 starter:{monthly:"price_1UQOt9HGcNIhcRMjZJVSgXII",yearly:"price_1UQkFSHGcNIhcRMjFswTkL1i"},
 growth:{monthly:"price_1UQOtBHGcNIhcRMj2uKPsRjD",yearly:"price_1UQkFUHGcNIhcRMjacSgTsVB"},
 elite:{monthly:"price_1UQOtDHGcNIhcRMjvH0HGgfV",yearly:"price_1UQkFXHGcNIhcRMjRKKYlbYD"}
};
export function priceDetails(id){
 for(const [tier,cycles] of Object.entries(PRICES)){
  if(cycles.monthly===id)return {tier,cycle:"monthly"};
  if(cycles.yearly===id)return {tier,cycle:"yearly"};
 }
 return null;
}
