import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

export function cartLinesDiscountsGenerateRun(input) {
  // 1. Only run if this discount gives product discounts
  if (!input.discount.discountClasses.includes(DiscountClass.Product)) {
    return { operations: [] };
  }

  // 2. Keep only cart lines whose product has the "promo" tag
  const promoLines = input.cart.lines.filter(
    (line) =>
      line.merchandise.__typename === 'ProductVariant' &&
      line.merchandise.product.hasAnyTag
  );

  // 3. Count promo items (2 of the same board also counts as 2)
  const promoItemCount = promoLines.reduce(
    (total, line) => total + line.quantity,
    0
  );
  if (promoItemCount < 2) {
    return { operations: [] };
  }

  // 4. Find the cheaper line
  const cheapestLine = promoLines.reduce((cheapest, line) =>
    Number(line.cost.amountPerQuantity.amount) <
    Number(cheapest.cost.amountPerQuantity.amount)
      ? line
      : cheapest
  );

  // 5. 15% off ONE unit of the cheaper item
  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: 'Buy 2 promo items: 15% off the cheaper one',
              targets: [{ cartLine: { id: cheapestLine.id, quantity: 1 } }],
              value: { percentage: { value: 15 } },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}