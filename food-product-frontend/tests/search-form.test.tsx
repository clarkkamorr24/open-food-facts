import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SearchForm } from "@/components/search/search-form";

import { dictionary, renderWithProviders } from "./helpers/render";

describe("SearchForm", () => {
  it("submits a trimmed query", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(<SearchForm isSearching={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(dictionary.search.label), "  nutella  ");
    await user.click(screen.getByRole("button", { name: dictionary.search.submit }));

    expect(onSubmit).toHaveBeenCalledWith("nutella");
  });

  it("rejects a query that is too short and shows an accessible error", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(<SearchForm isSearching={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(dictionary.search.label), "a");
    await user.click(screen.getByRole("button", { name: dictionary.search.submit }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(dictionary.search.minLength);
    expect(screen.getByLabelText(dictionary.search.label)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("does not submit an empty query", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(<SearchForm isSearching={false} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: dictionary.search.submit }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the error once a valid query is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(<SearchForm isSearching={false} onSubmit={onSubmit} />);
    const input = screen.getByLabelText(dictionary.search.label);

    await user.type(input, "a");
    await user.click(screen.getByRole("button", { name: dictionary.search.submit }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.type(input, "bc");
    await user.click(screen.getByRole("button", { name: dictionary.search.submit }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith("abc");
  });

  it("disables the submit button while a search is running", () => {
    renderWithProviders(<SearchForm isSearching onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: dictionary.search.searching })).toBeDisabled();
  });

  it("can be submitted with the keyboard", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(<SearchForm isSearching={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(dictionary.search.label), "oreo{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("oreo");
  });
});
