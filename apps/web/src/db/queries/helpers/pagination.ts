/** Calculate skip offset and total pages for pagination */
export function paginate(page: number, pageSize: number, totalCount: number) {
  return {
    skip: (page - 1) * pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
